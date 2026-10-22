import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Ban, Copy, CreditCard, Gift, Mail, MessageCircle, Pencil, Phone, Save, Send, Truck, UserRound } from 'lucide-react';
import { cn, formatDateTime } from '@shared/format';
import { formatMoney } from '@shared/money';
import * as api from '../../api';
import { Badge, OrderStatusBadge, PaymentStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorState, Skeleton } from '../../components/ui/feedback';
import { Field, TextArea } from '../../components/ui/form';
import { DetailList, PageHeader, Panel } from '../../components/ui/Panel';
import { toast } from '../../components/ui/toast';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { notifyOrdersChanged } from '../../hooks/usePendingOrders';
import { errorText, toFieldErrors } from '../../lib/errors';
import { telLink, whatsappLink } from '../../lib/format';
import { ORDER_STATUS_TONES, ORDER_TRANSITION_VERBS, PAYMENT_TRANSITION_VERBS, isOrderStatus, type Tone } from '../../lib/status';
import { useCan } from '../../session';
import type { AdminOrder, AdminOrderEvent, AdminOrderItem } from '../../types';
import { describeEvent } from './orderEvents';
import { DeliveryDialog, TransitionDialog, type TransitionTarget } from './OrderDialogs';

function ItemRow({ item }: { item: AdminOrderItem }) {
    return (
        <li className="flex gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-sunken text-muted" aria-hidden>
                {item.type === 'pack' ? <Gift className="size-4" /> : <span className="text-2xs font-medium">{item.variant_label?.replace(' ml', '') ?? '—'}</span>}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-medium text-ink">
                        {item.name}
                        {item.variant_label && <span className="font-normal text-muted"> · {item.variant_label}</span>}
                    </p>
                    <p className="text-sm font-medium tabular-nums text-ink">{formatMoney(item.line_total)}</p>
                </div>
                <p className="mt-0.5 text-xs text-muted tabular-nums">
                    {item.quantity} × {formatMoney(item.unit_price)}
                    {item.compare_at_price !== null && item.compare_at_price > item.unit_price && (
                        <>
                            {' '}
                            <span className="line-through">{formatMoney(item.compare_at_price)}</span>
                        </>
                    )}
                    {item.sku && <span className="whitespace-nowrap"> · {item.sku}</span>}
                </p>
                {item.selections.length > 0 && (
                    <ol className="mt-2.5 flex flex-col gap-1 border-l border-line pl-3 text-xs">
                        {item.selections.map((selection) => (
                            <li key={selection.position} className="flex justify-between gap-3">
                                <span className="min-w-0 text-ink">
                                    <span className="mr-1.5 tabular-nums text-muted">{selection.position}.</span>
                                    {selection.product_name} <span className="text-muted">· {selection.size_ml} ml</span>
                                    {selection.sku && <span className="hidden whitespace-nowrap text-muted sm:inline"> · {selection.sku}</span>}
                                </span>
                                <span className="shrink-0 tabular-nums text-muted">{formatMoney(selection.unit_price)}</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </li>
    );
}

const DOT_TONES: Record<Tone, string> = {
    warning: 'bg-warning',
    accent: 'bg-accent',
    ink: 'bg-ink',
    success: 'bg-success',
    danger: 'bg-danger',
    neutral: 'bg-muted',
    muted: 'bg-muted',
};

function eventDot(event: AdminOrderEvent): string {
    if (event.type === 'status' && isOrderStatus(event.to)) {
        return DOT_TONES[ORDER_STATUS_TONES[event.to]];
    }

    return event.type === 'note' ? 'bg-accent' : 'bg-line-strong';
}

function Timeline({ events }: { events: AdminOrderEvent[] }) {
    return (
        <ol className="relative flex flex-col gap-5 before:absolute before:inset-y-1 before:left-[0.4375rem] before:w-px before:bg-line">
            {events.map((event) => {
                const { title, detail } = describeEvent(event);
                const isNote = event.type === 'note';

                return (
                    <li key={event.id} className="relative flex gap-4 pl-0">
                        <span className={cn('relative z-10 mt-1 size-3.5 shrink-0 rounded-full border-2 border-raised', eventDot(event))} aria-hidden />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-ink">{title}</p>
                            {detail && (
                                <p className={cn('mt-1 whitespace-pre-line text-sm', isNote ? 'rounded-lg border border-line bg-sunken/60 px-3 py-2 text-ink' : 'text-muted')}>
                                    {detail}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-muted">
                                {formatDateTime(event.created_at)} · {event.user ?? (event.type === 'status' && event.from === null ? 'Client' : 'Système')}
                            </p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function NoteComposer({ reference, onAdded }: { reference: string; onAdded: (order: AdminOrder) => void }) {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (note.trim() === '') {
            setError('Écrivez une note avant de l’ajouter.');

            return;
        }
        setBusy(true);
        setError(null);
        try {
            onAdded(await api.orders.addNote(reference, note.trim()));
            setNote('');
            toast.success('Note ajoutée à l’historique.');
        } catch (failure) {
            setError(toFieldErrors(failure).note ?? errorText(failure));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={(event) => void submit(event)} className="mb-6 flex flex-col gap-2">
            <Field label="Ajouter une note interne" labelHidden error={error ?? undefined}>
                {(control) => (
                    <TextArea
                        {...control}
                        rows={2}
                        maxLength={1000}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Ajouter une note pour l’équipe (appel client, précision de livraison…)"
                    />
                )}
            </Field>
            <div className="flex justify-end">
                <Button type="submit" size="sm" icon={Send} loading={busy} disabled={note.trim() === ''}>
                    Ajouter la note
                </Button>
            </div>
        </form>
    );
}

function AdminNotes({ order, onSaved }: { order: AdminOrder; onSaved: (order: AdminOrder) => void }) {
    const [value, setValue] = useState(order.admin_notes ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dirty = value.trim() !== (order.admin_notes ?? '').trim();

    useEffect(() => setValue(order.admin_notes ?? ''), [order.admin_notes]);

    async function save() {
        setBusy(true);
        setError(null);
        try {
            onSaved(await api.orders.updateDelivery(order.reference, { admin_notes: value.trim() === '' ? null : value.trim() }));
            toast.success('Note de la commande enregistrée.');
        } catch (failure) {
            setError(toFieldErrors(failure).admin_notes ?? errorText(failure));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Panel title="Mémo de commande" description="Note permanente, visible par l’équipe uniquement.">
            <div className="flex flex-col gap-2">
                <Field label="Mémo de commande" labelHidden error={error ?? undefined} counter={{ value: value.length, max: 2000 }}>
                    {(control) => <TextArea {...control} rows={3} maxLength={2000} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ex. client fidèle, préfère être appelé le soir…" />}
                </Field>
                {dirty && (
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setValue(order.admin_notes ?? '')} disabled={busy}>
                            Annuler
                        </Button>
                        <Button size="sm" icon={Save} loading={busy} onClick={() => void save()}>
                            Enregistrer
                        </Button>
                    </div>
                )}
            </div>
        </Panel>
    );
}

function DetailSkeleton() {
    return (
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true">
            <span className="sr-only" role="status">
                Chargement de la commande…
            </span>
            <div className="flex flex-col gap-6 lg:col-span-2">
                <div className="rounded-xl border border-line bg-raised p-5">
                    {Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className="flex gap-4 py-3">
                            <Skeleton className="size-10" />
                            <div className="flex-1">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="mt-2 h-3 w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <div className="flex flex-col gap-6">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-52 w-full rounded-xl" />
            </div>
        </div>
    );
}

export default function OrderDetailPage() {
    const { reference = '' } = useParams();
    useDocumentTitle(`Commande ${reference}`);
    const canViewCustomers = useCan('view-customers');
    const query = useApiQuery(`order:${reference}`, (signal) => api.orders.show(reference, signal));
    const [transition, setTransition] = useState<TransitionTarget | null>(null);
    const [editingDelivery, setEditingDelivery] = useState(false);
    const order = query.data;

    const update = (next: AdminOrder) => query.setData(next);

    if (query.error && !order) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader title={`Commande ${reference}`} back={{ to: '/commandes', label: 'Commandes' }} />
                <Panel>
                    <ErrorState error={query.error} onRetry={query.reload} />
                </Panel>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader title={`Commande ${reference}`} back={{ to: '/commandes', label: 'Commandes' }} />
                <DetailSkeleton />
            </div>
        );
    }

    const forward = order.allowed_transitions.filter((option) => option.value !== 'cancelled');
    const canCancel = order.allowed_transitions.some((option) => option.value === 'cancelled');
    const firstName = order.customer_name.split(' ')[0];
    const whatsappMessage =
        order.locale === 'ar' ? `مرحبًا ${firstName}، معك Myperfum بخصوص طلبك ${order.reference}.` : `Bonjour ${firstName}, ici Myperfum au sujet de votre commande ${order.reference}.`;

    const copyReference = async () => {
        try {
            await navigator.clipboard.writeText(order.reference);
            toast.info('Référence copiée.');
        } catch {
            toast.error('Copie impossible dans ce navigateur.');
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                back={{ to: '/commandes', label: 'Commandes' }}
                title={
                    <span className="inline-flex flex-wrap items-center gap-2">
                        Commande {order.reference}
                        <button
                            type="button"
                            onClick={() => void copyReference()}
                            className="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-ink/[0.06] hover:text-ink"
                            aria-label="Copier la référence"
                            title="Copier la référence"
                        >
                            <Copy className="size-3.5" aria-hidden />
                        </button>
                    </span>
                }
                meta={
                    <>
                        <OrderStatusBadge status={order.status} label={order.status_label} />
                        <PaymentStatusBadge status={order.payment_status} label={order.payment_status_label} />
                        <span className="text-xs text-muted">Passée le {formatDateTime(order.placed_at)}</span>
                    </>
                }
                actions={
                    <>
                        {canCancel && (
                            <Button variant="danger-outline" icon={Ban} onClick={() => setTransition({ kind: 'status', value: 'cancelled' })}>
                                Annuler
                            </Button>
                        )}
                        {forward.map((option, index) => (
                            <Button
                                key={option.value}
                                variant={index === 0 ? 'primary' : 'secondary'}
                                icon={option.value === 'shipped' ? Truck : undefined}
                                onClick={() => setTransition({ kind: 'status', value: option.value })}
                            >
                                {ORDER_TRANSITION_VERBS[option.value]}
                            </Button>
                        ))}
                    </>
                }
            />

            {(order.status === 'cancelled' || order.status === 'delivered') && (
                <p className="text-sm text-muted">
                    {order.status === 'cancelled'
                        ? `Commande annulée le ${formatDateTime(order.cancelled_at)} — les articles ont été remis en stock.`
                        : `Commande livrée le ${formatDateTime(order.delivered_at)}.`}
                </p>
            )}

            <div className="grid items-start gap-6 lg:grid-cols-3">
                <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
                    <Panel title={`Articles (${order.items_count})`}>
                        <ul className="divide-y divide-line">
                            {(order.items ?? []).map((item) => (
                                <ItemRow key={item.id} item={item} />
                            ))}
                        </ul>
                        <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-muted">Sous-total</dt>
                                <dd className="tabular-nums text-ink">{formatMoney(order.subtotal)}</dd>
                            </div>
                            {order.discount_total > 0 && (
                                <div className="flex justify-between gap-4">
                                    <dt className="text-muted">
                                        Remise{order.coupon_code && <span className="ml-1.5 rounded border border-line px-1.5 py-px text-2xs font-medium tracking-wide text-ink">{order.coupon_code}</span>}
                                    </dt>
                                    <dd className="tabular-nums text-success">−{formatMoney(order.discount_total)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between gap-4">
                                <dt className="text-muted">Livraison{order.delivery_zone && ` · ${order.delivery_zone}`}</dt>
                                <dd className="tabular-nums text-ink">{order.delivery_fee === 0 ? 'Offerte' : formatMoney(order.delivery_fee)}</dd>
                            </div>
                            <div className="mt-1 flex justify-between gap-4 border-t border-line pt-3 text-base">
                                <dt className="font-medium text-ink">Total</dt>
                                <dd className="font-semibold tabular-nums text-ink">{formatMoney(order.total)}</dd>
                            </div>
                        </dl>
                    </Panel>

                    <Panel title="Historique" description="Changements de statut, de paiement, modifications et notes internes.">
                        <NoteComposer reference={order.reference} onAdded={update} />
                        <Timeline events={order.events ?? []} />
                    </Panel>
                </div>

                <div className="flex min-w-0 flex-col gap-6">
                    <Panel title="Client">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-sunken text-muted" aria-hidden>
                                    <UserRound className="size-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-medium text-ink">{order.customer_name}</p>
                                    <p className="text-sm text-muted tabular-nums">{order.phone}</p>
                                    {order.locale === 'ar' && (
                                        <Badge tone="accent" className="mt-1.5">
                                            Commande passée en arabe
                                        </Badge>
                                    )}
                                    {order.email && (
                                        <a href={`mailto:${order.email}`} className="inline-flex items-center gap-1.5 break-all text-sm text-muted hover:text-ink">
                                            <Mail className="size-3.5 shrink-0" aria-hidden />
                                            {order.email}
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <a
                                    href={telLink(order.phone_e164)}
                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line-strong text-sm font-medium text-ink transition-colors hover:bg-ink/[0.06]"
                                >
                                    <Phone className="size-4" aria-hidden />
                                    Appeler
                                </a>
                                <a
                                    href={whatsappLink(order.phone_e164, whatsappMessage)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line-strong text-sm font-medium text-ink transition-colors hover:bg-ink/[0.06]"
                                >
                                    <MessageCircle className="size-4" aria-hidden />
                                    WhatsApp
                                    <span className="sr-only">(nouvel onglet)</span>
                                </a>
                            </div>
                            {order.customer ? (
                                <p className="text-xs text-muted">
                                    Compte client :{' '}
                                    {canViewCustomers ? (
                                        <Link to={`/clients/${order.customer.id}`} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                                            {order.customer.name}
                                        </Link>
                                    ) : (
                                        order.customer.name
                                    )}
                                </p>
                            ) : (
                                <p className="text-xs text-muted">Commande passée sans compte client.</p>
                            )}
                        </div>
                    </Panel>

                    <Panel
                        title="Livraison"
                        actions={
                            <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingDelivery(true)}>
                                Modifier
                            </Button>
                        }
                    >
                        <DetailList
                            items={[
                                { label: 'Ville', value: order.city + (order.delivery_zone ? ` · ${order.delivery_zone}` : '') },
                                { label: 'Adresse', value: <span className="whitespace-pre-line">{order.address}</span> },
                                { label: 'Instructions', value: order.delivery_notes, hidden: !order.delivery_notes },
                                { label: 'Transporteur', value: order.carrier ?? <span className="text-muted">Non renseigné</span> },
                                { label: 'N° de suivi', value: order.tracking_number ?? <span className="text-muted">Non renseigné</span> },
                            ]}
                        />
                    </Panel>

                    <Panel title="Paiement">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-3">
                                <span className="inline-flex items-center gap-2 text-sm text-ink">
                                    <CreditCard className="size-4 text-muted" aria-hidden />
                                    {order.payment_method_label}
                                </span>
                                <PaymentStatusBadge status={order.payment_status} label={order.payment_status_label} />
                            </div>
                            {order.allowed_payment_transitions.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {order.allowed_payment_transitions.map((option) => (
                                        <Button
                                            key={option.value}
                                            size="sm"
                                            variant={option.value === 'paid' ? 'secondary' : option.value === 'refunded' ? 'danger-outline' : 'ghost'}
                                            onClick={() => setTransition({ kind: 'payment', value: option.value })}
                                            disabled={option.value === 'paid' && order.status === 'cancelled'}
                                        >
                                            {PAYMENT_TRANSITION_VERBS[option.value]}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted">Aucune action de paiement possible.</p>
                            )}
                            {order.status === 'cancelled' && order.payment_status === 'unpaid' && (
                                <p className="text-xs text-muted">Une commande annulée ne peut pas être marquée payée.</p>
                            )}
                        </div>
                    </Panel>

                    <AdminNotes order={order} onSaved={update} />
                </div>
            </div>

            <TransitionDialog
                order={order}
                target={transition}
                onClose={() => setTransition(null)}
                onDone={(next) => {
                    update(next);
                    notifyOrdersChanged();
                }}
            />
            <DeliveryDialog order={order} open={editingDelivery} onClose={() => setEditingDelivery(false)} onSaved={update} />
        </div>
    );
}

