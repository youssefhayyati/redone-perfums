import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, TicketPercent, Trash2 } from 'lucide-react';
import { formatShortDate } from '@shared/format';
import { formatMoney } from '@shared/money';
import * as api from '../api';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/feedback';
import { AffixInput, Field, Fieldset, MoneyInput, RadioCards, Switch, TextInput } from '../components/ui/form';
import { PageHeader, Panel } from '../components/ui/Panel';
import { DataTable, Td, Th } from '../components/ui/Table';
import { toast } from '../components/ui/toast';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { errorText, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../lib/errors';
import { formatNumber } from '../lib/format';
import type { AdminCoupon } from '../types';
import { couponFormToPayload, couponState, couponToForm, describeCouponValue, emptyCouponForm, type CouponForm } from './coupons/couponForm';

function CouponDialog({ coupon, open, onClose, onSaved }: { coupon: AdminCoupon | null; open: boolean; onClose: () => void; onSaved: (coupon: AdminCoupon) => void }) {
    const [form, setForm] = useState<CouponForm>(emptyCouponForm);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setForm(coupon ? couponToForm(coupon) : emptyCouponForm());
            setErrors({});
        }
    }, [open, coupon]);

    const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => setForm((current) => ({ ...current, [key]: value }));

    async function submit(event: FormEvent) {
        event.preventDefault();
        const { payload, errors: local } = couponFormToPayload(form);
        if (hasErrors(local)) {
            setErrors(local);
            focusFirstInvalid();

            return;
        }
        setBusy(true);
        try {
            const saved = coupon ? await api.coupons.update(coupon.id, payload) : await api.coupons.create(payload);
            onSaved(saved);
            toast.success(coupon ? `Code ${saved.code} enregistré.` : `Code ${saved.code} créé.`);
            onClose();
        } catch (error) {
            const fields = toFieldErrors(error);
            setErrors(fields);
            if (!hasErrors(fields)) {
                toast.error(errorText(error));
            }
            focusFirstInvalid();
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            busy={busy}
            size="lg"
            title={coupon ? `Modifier le code ${coupon.code}` : 'Nouveau code promo'}
            footer={
                <>
                    <Button onClick={onClose} disabled={busy}>
                        Annuler
                    </Button>
                    <Button type="submit" form="coupon-form" variant="primary" loading={busy}>
                        {coupon ? 'Enregistrer' : 'Créer le code'}
                    </Button>
                </>
            }
        >
            <form id="coupon-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Code" required error={errors.code} hint="Saisi par le client au panier. Majuscules automatiques.">
                        {(control) => (
                            <TextInput
                                {...control}
                                value={form.code}
                                maxLength={40}
                                spellCheck={false}
                                autoCapitalize="characters"
                                className="font-mono uppercase tracking-wide"
                                onChange={(event) => set('code', event.target.value.toUpperCase().replace(/\s/g, ''))}
                                data-autofocus
                            />
                        )}
                    </Field>
                    <Field label="Description interne" optional error={errors.description}>
                        {(control) => <TextInput {...control} value={form.description} maxLength={255} onChange={(event) => set('description', event.target.value)} placeholder="Ex. Campagne Instagram de novembre" />}
                    </Field>
                </div>
                <Fieldset legend="Type de remise" error={errors.type}>
                    <RadioCards
                        value={form.type}
                        onChange={(value) => set('type', value)}
                        options={[
                            { value: 'percent', label: 'Pourcentage', description: 'Sur le montant des articles.' },
                            { value: 'fixed', label: 'Montant fixe', description: 'En dirhams, plafonné au montant des articles.' },
                        ]}
                    />
                </Fieldset>
                <div className="grid gap-4 sm:grid-cols-3">
                    {form.type === 'percent' ? (
                        <Field label="Remise" required error={errors.value} hint="De 1 à 90 %.">
                            {(control) => <AffixInput {...control} inputMode="numeric" suffix="%" value={form.percent} onChange={(event) => set('percent', event.target.value)} />}
                        </Field>
                    ) : (
                        <Field label="Remise" required error={errors.value}>
                            {(control) => <MoneyInput {...control} value={form.amount} onChange={(event) => set('amount', event.target.value)} />}
                        </Field>
                    )}
                    <Field label="Montant minimum" optional error={errors.min_subtotal}>
                        {(control) => <MoneyInput {...control} value={form.min_subtotal} onChange={(event) => set('min_subtotal', event.target.value)} />}
                    </Field>
                    <Field label="Utilisations max." optional error={errors.max_uses} hint={coupon ? `Déjà utilisé ${coupon.used_count} fois.` : undefined}>
                        {(control) => <TextInput {...control} inputMode="numeric" value={form.max_uses} placeholder="Illimité" onChange={(event) => set('max_uses', event.target.value)} />}
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Début de validité" optional error={errors.starts_at} hint="Heure du Maroc.">
                        {(control) => <TextInput {...control} type="datetime-local" value={form.starts_at} onChange={(event) => set('starts_at', event.target.value)} />}
                    </Field>
                    <Field label="Fin de validité" optional error={errors.ends_at}>
                        {(control) => <TextInput {...control} type="datetime-local" value={form.ends_at} min={form.starts_at || undefined} onChange={(event) => set('ends_at', event.target.value)} />}
                    </Field>
                </div>
                <Switch checked={form.is_active} onChange={(value) => set('is_active', value)} label="Code actif" description="Désactivé, le code est refusé au panier." />
            </form>
        </Dialog>
    );
}

export default function CouponsPage() {
    useDocumentTitle('Codes promo');
    const query = useApiQuery('coupons', (signal) => api.coupons.list(signal));
    const [editing, setEditing] = useState<AdminCoupon | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<AdminCoupon | null>(null);

    const upsert = (coupon: AdminCoupon) =>
        query.setData((current) => {
            const list = current ?? [];

            return list.some((item) => item.id === coupon.id) ? list.map((item) => (item.id === coupon.id ? coupon : item)) : [coupon, ...list];
        });

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Codes promo"
                description="Réductions saisies par les clients au panier."
                actions={
                    <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                        Nouveau code
                    </Button>
                }
            />
            <Panel padded={false}>
                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={4} columns={5} />
                ) : query.data.length === 0 ? (
                    <EmptyState
                        icon={TicketPercent}
                        title="Aucun code promo"
                        description="Créez un code pour une campagne, un partenariat ou vos clients fidèles."
                        action={
                            <Button size="sm" variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                                Nouveau code
                            </Button>
                        }
                    />
                ) : (
                    <DataTable caption="Codes promo">
                        <thead>
                            <tr>
                                <Th>Code</Th>
                                <Th align="right">Remise</Th>
                                <Th hideBelow="md" align="right">
                                    Minimum
                                </Th>
                                <Th hideBelow="sm" align="right">
                                    Utilisations
                                </Th>
                                <Th hideBelow="lg">Validité</Th>
                                <Th>État</Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </tr>
                        </thead>
                        <tbody>
                            {query.data.map((coupon) => {
                                const state = couponState(coupon);

                                return (
                                    <tr key={coupon.id} className="transition-colors hover:bg-ink/[0.03]">
                                        <Td>
                                            <span className="font-mono text-sm font-medium tracking-wide text-ink">{coupon.code}</span>
                                            {coupon.description && <span className="block max-w-56 truncate text-xs text-muted">{coupon.description}</span>}
                                        </Td>
                                        <Td align="right" className="whitespace-nowrap font-medium tabular-nums">
                                            {describeCouponValue(coupon)}
                                        </Td>
                                        <Td hideBelow="md" align="right" className="whitespace-nowrap tabular-nums text-muted">
                                            {coupon.min_subtotal ? formatMoney(coupon.min_subtotal) : '—'}
                                        </Td>
                                        <Td hideBelow="sm" align="right" className="whitespace-nowrap tabular-nums">
                                            {formatNumber(coupon.used_count)}
                                            <span className="text-muted"> / {coupon.max_uses === null ? '∞' : formatNumber(coupon.max_uses)}</span>
                                        </Td>
                                        <Td hideBelow="lg" className="whitespace-nowrap text-xs text-muted">
                                            {coupon.starts_at || coupon.ends_at
                                                ? `${coupon.starts_at ? `du ${formatShortDate(coupon.starts_at)}` : 'dès maintenant'} ${coupon.ends_at ? `au ${formatShortDate(coupon.ends_at)}` : 'sans fin'}`
                                                : 'Permanente'}
                                        </Td>
                                        <Td>
                                            <Badge tone={state.tone} dot>
                                                {state.label}
                                            </Badge>
                                        </Td>
                                        <Td align="right" className="whitespace-nowrap">
                                            <IconButton icon={Pencil} size="sm" label={`Modifier le code ${coupon.code}`} onClick={() => setEditing(coupon)} />
                                            <IconButton icon={Trash2} size="sm" variant="danger" label={`Supprimer le code ${coupon.code}`} onClick={() => setDeleting(coupon)} />
                                        </Td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </DataTable>
                )}
            </Panel>

            <CouponDialog
                coupon={editing}
                open={creating || editing !== null}
                onClose={() => {
                    setCreating(false);
                    setEditing(null);
                }}
                onSaved={upsert}
            />
            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                title={`Supprimer le code ${deleting?.code ?? ''} ?`}
                description="Les commandes qui l’ont utilisé gardent le code dans leur historique."
                confirmLabel="Supprimer"
                onConfirm={async () => {
                    if (!deleting) {
                        return;
                    }
                    await api.coupons.remove(deleting.id);
                    query.setData((current) => current?.filter((item) => item.id !== deleting.id));
                    toast.success('Code supprimé.');
                }}
            />
        </div>
    );
}
