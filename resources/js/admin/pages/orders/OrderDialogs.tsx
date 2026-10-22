import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '@shared/http';
import * as api from '../../api';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { InlineAlert } from '../../components/ui/feedback';
import { Field, TextArea, TextInput } from '../../components/ui/form';
import { toast } from '../../components/ui/toast';
import { errorText, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../../lib/errors';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../../lib/status';
import type { AdminOrder, OrderStatus, PaymentStatus } from '../../types';
import { deliveryChanges, deliveryFormFrom, isAddressLocked, validateDelivery, type DeliveryForm } from './deliveryForm';

type Target = { kind: 'status'; value: OrderStatus } | { kind: 'payment'; value: PaymentStatus };

const STATUS_COPY: Record<OrderStatus, { title: string; body: string; confirm: string }> = {
    pending: { title: 'Remettre la commande en attente ?', body: '', confirm: 'Remettre en attente' },
    confirmed: {
        title: 'Confirmer la commande ?',
        body: 'À faire après avoir joint le client pour valider la commande et l’adresse de livraison.',
        confirm: 'Confirmer la commande',
    },
    processing: { title: 'Passer la commande en préparation ?', body: 'Le colis est en cours de préparation.', confirm: 'Passer en préparation' },
    shipped: {
        title: 'Marquer la commande comme expédiée ?',
        body: 'L’adresse ne pourra plus être modifiée ensuite. Pensez à renseigner le transporteur et le numéro de suivi.',
        confirm: 'Marquer expédiée',
    },
    delivered: { title: 'Marquer la commande comme livrée ?', body: 'Le client a reçu son colis.', confirm: 'Marquer livrée' },
    cancelled: {
        title: 'Annuler cette commande ?',
        body: 'Les articles sont remis en stock et la commande sort du chiffre d’affaires. L’annulation est définitive.',
        confirm: 'Annuler la commande',
    },
};

const PAYMENT_COPY: Record<PaymentStatus, { title: string; body: string; confirm: string }> = {
    unpaid: { title: 'Marquer le paiement comme non reçu ?', body: 'À utiliser pour corriger une erreur de saisie.', confirm: 'Marquer non payée' },
    paid: { title: 'Marquer la commande comme payée ?', body: 'Le paiement à la livraison a bien été encaissé.', confirm: 'Marquer payée' },
    refunded: {
        title: 'Marquer la commande comme remboursée ?',
        body: 'Le client a été remboursé. Ce statut est définitif.',
        confirm: 'Marquer remboursée',
    },
};

/** Status or payment change, with an optional note recorded in the timeline. */
export function TransitionDialog({
    order,
    target,
    onClose,
    onDone,
}: {
    order: AdminOrder;
    target: Target | null;
    onClose: () => void;
    onDone: (order: AdminOrder) => void;
}) {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (target) {
            setNote('');
            setError(null);
        }
    }, [target]);

    const copy = target ? (target.kind === 'status' ? STATUS_COPY[target.value] : PAYMENT_COPY[target.value]) : null;
    const danger = target?.value === 'cancelled' || target?.value === 'refunded';

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!target) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const trimmed = note.trim() === '' ? null : note.trim();
            const updated =
                target.kind === 'status'
                    ? await api.orders.updateStatus(order.reference, target.value, trimmed)
                    : await api.orders.updatePayment(order.reference, target.value, trimmed);
            onDone(updated);
            toast.success(
                target.kind === 'status'
                    ? `Commande ${order.reference} : ${ORDER_STATUS_LABELS[target.value as OrderStatus].toLowerCase()}.`
                    : `Paiement : ${PAYMENT_STATUS_LABELS[target.value as PaymentStatus].toLowerCase()}.`,
            );
            onClose();
        } catch (failure) {
            const fields = toFieldErrors(failure);
            setError(fields.status ?? fields.payment_status ?? fields.note ?? errorText(failure));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open={target !== null}
            onClose={onClose}
            busy={busy}
            size="sm"
            role={danger ? 'alertdialog' : 'dialog'}
            title={copy?.title ?? ''}
            description={copy?.body || undefined}
            footer={
                <>
                    <Button onClick={onClose} disabled={busy}>
                        Retour
                    </Button>
                    <Button type="submit" form="transition-form" variant={danger ? 'danger' : 'primary'} loading={busy}>
                        {copy?.confirm}
                    </Button>
                </>
            }
        >
            <form id="transition-form" onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
                {error && (
                    <InlineAlert tone="danger" live>
                        {error}
                    </InlineAlert>
                )}
                <Field label={danger ? 'Motif' : 'Note'} optional hint="Visible uniquement par l’équipe, dans l’historique de la commande." counter={{ value: note.length, max: 500 }}>
                    {(control) => <TextArea {...control} rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} data-autofocus />}
                </Field>
            </form>
        </Dialog>
    );
}

export type { Target as TransitionTarget };

export function DeliveryDialog({ order, open, onClose, onSaved }: { order: AdminOrder; open: boolean; onClose: () => void; onSaved: (order: AdminOrder) => void }) {
    const [form, setForm] = useState<DeliveryForm>(() => deliveryFormFrom(order));
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const locked = isAddressLocked(order.status);

    useEffect(() => {
        if (open) {
            setForm(deliveryFormFrom(order));
            setErrors({});
            setFailure(null);
        }
    }, [open, order]);

    const set = (key: keyof DeliveryForm) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

    async function submit(event: FormEvent) {
        event.preventDefault();
        const local = validateDelivery(form, locked) as FieldErrors;
        setErrors(local);
        setFailure(null);
        if (hasErrors(local)) {
            focusFirstInvalid();

            return;
        }

        const changes = deliveryChanges(order, form);
        if (Object.keys(changes).length === 0) {
            onClose();

            return;
        }

        setBusy(true);
        try {
            const updated = await api.orders.updateDelivery(order.reference, changes);
            onSaved(updated);
            toast.success('Informations de livraison enregistrées.');
            onClose();
        } catch (error) {
            const fields = toFieldErrors(error);
            setErrors(fields);
            if (!(error instanceof ApiError && error.isValidation) || fields.address) {
                setFailure(fields.address ?? errorText(error));
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
            title="Client et livraison"
            description={`Commande ${order.reference}`}
            footer={
                <>
                    <Button onClick={onClose} disabled={busy}>
                        Annuler
                    </Button>
                    <Button type="submit" form="delivery-form" variant="primary" loading={busy}>
                        Enregistrer
                    </Button>
                </>
            }
        >
            <form id="delivery-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                {locked && (
                    <InlineAlert tone="warning" title="Adresse verrouillée">
                        L’adresse ne peut plus être modifiée une fois la commande expédiée. Le transporteur et le numéro de suivi restent modifiables.
                    </InlineAlert>
                )}
                {failure && (
                    <InlineAlert tone="danger" live>
                        {failure}
                    </InlineAlert>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nom du client" error={errors.customer_name} required={!locked}>
                        {(control) => <TextInput {...control} value={form.customer_name} onChange={set('customer_name')} disabled={locked} autoComplete="off" data-autofocus />}
                    </Field>
                    <Field label="Téléphone" error={errors.phone} required={!locked} hint="Format marocain : 06 12 34 56 78 ou +212 6…">
                        {(control) => <TextInput {...control} type="tel" value={form.phone} onChange={set('phone')} disabled={locked} autoComplete="off" />}
                    </Field>
                </div>
                <Field label={`Adresse (${order.city})`} error={errors.address} required={!locked}>
                    {(control) => <TextArea {...control} rows={2} value={form.address} onChange={set('address')} disabled={locked} />}
                </Field>
                <Field label="Instructions de livraison" optional error={errors.delivery_notes}>
                    {(control) => <TextArea {...control} rows={2} value={form.delivery_notes} onChange={set('delivery_notes')} disabled={locked} />}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Transporteur" optional error={errors.carrier}>
                        {(control) => <TextInput {...control} value={form.carrier} onChange={set('carrier')} maxLength={80} placeholder="Ex. Amana, CTM, livreur…" />}
                    </Field>
                    <Field label="Numéro de suivi" optional error={errors.tracking_number}>
                        {(control) => <TextInput {...control} value={form.tracking_number} onChange={set('tracking_number')} maxLength={80} />}
                    </Field>
                </div>
            </form>
        </Dialog>
    );
}
