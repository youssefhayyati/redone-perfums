import type { AdminOrderEvent } from '../../types';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, isOrderStatus, isPaymentStatus } from '../../lib/status';

/** French labels for the order fields named in "delivery" events. */
export const DELIVERY_FIELD_LABELS: Record<string, string> = {
    customer_name: 'nom du client',
    phone: 'téléphone',
    address: 'adresse',
    delivery_notes: 'instructions de livraison',
    carrier: 'transporteur',
    tracking_number: 'numéro de suivi',
    admin_notes: 'note interne',
};

export interface EventDescription {
    title: string;
    detail: string | null;
}

/**
 * Human wording for a timeline entry. Delivery events carry the changed fields as
 * "Champs modifiés : address, phone"; they are translated here.
 */
export function describeEvent(event: AdminOrderEvent): EventDescription {
    switch (event.type) {
        case 'status': {
            if (event.from === null) {
                return { title: 'Commande passée', detail: event.note };
            }
            const from = isOrderStatus(event.from) ? ORDER_STATUS_LABELS[event.from] : event.from;
            const to = isOrderStatus(event.to) ? ORDER_STATUS_LABELS[event.to] : (event.to ?? '');

            return { title: `Statut : ${from} → ${to}`, detail: event.note };
        }
        case 'payment': {
            const from = isPaymentStatus(event.from) ? PAYMENT_STATUS_LABELS[event.from] : (event.from ?? '');
            const to = isPaymentStatus(event.to) ? PAYMENT_STATUS_LABELS[event.to] : (event.to ?? '');

            return { title: `Paiement : ${from} → ${to}`, detail: event.note };
        }
        case 'delivery': {
            const match = /^Champs modifiés : (.+)$/.exec(event.note ?? '');
            if (match) {
                const fields = match[1]!
                    .split(',')
                    .map((field) => field.trim())
                    .filter(Boolean)
                    .map((field) => DELIVERY_FIELD_LABELS[field] ?? field);

                return { title: 'Informations de livraison modifiées', detail: `Modifié : ${fields.join(', ')}.` };
            }

            return { title: 'Informations de livraison modifiées', detail: event.note };
        }
        case 'note':
            return { title: 'Note interne', detail: event.note };
        default:
            return { title: event.type, detail: event.note };
    }
}
