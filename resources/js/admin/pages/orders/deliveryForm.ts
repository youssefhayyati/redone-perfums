import { normalizeMoroccanPhone } from '@shared/phone';
import type { AdminOrder, DeliveryUpdate, OrderStatus } from '../../types';

/**
 * Editing the customer / delivery block of an order. The API refuses any address
 * field once the order has shipped — even unchanged — so only modified fields are
 * sent, and address fields never once they are locked.
 */
export interface DeliveryForm {
    customer_name: string;
    phone: string;
    address: string;
    delivery_notes: string;
    carrier: string;
    tracking_number: string;
}

export const ADDRESS_FIELDS = ['customer_name', 'phone', 'address', 'delivery_notes'] as const;

export function isAddressLocked(status: OrderStatus): boolean {
    return status === 'shipped' || status === 'delivered' || status === 'cancelled';
}

export function deliveryFormFrom(order: AdminOrder): DeliveryForm {
    return {
        customer_name: order.customer_name,
        phone: order.phone,
        address: order.address,
        delivery_notes: order.delivery_notes ?? '',
        carrier: order.carrier ?? '',
        tracking_number: order.tracking_number ?? '',
    };
}

/** Client-side checks mirroring the API rules, so obvious mistakes never leave the dialog. */
export function validateDelivery(form: DeliveryForm, locked: boolean): Partial<Record<keyof DeliveryForm, string>> {
    const errors: Partial<Record<keyof DeliveryForm, string>> = {};

    if (!locked) {
        if (form.customer_name.trim().length < 2) {
            errors.customer_name = 'Indiquez le nom du client (2 caractères minimum).';
        }
        if (normalizeMoroccanPhone(form.phone) === null) {
            errors.phone = 'Numéro marocain attendu, par exemple 06 12 34 56 78.';
        }
        if (form.address.trim().length < 8) {
            errors.address = 'L’adresse doit contenir au moins 8 caractères.';
        }
    }

    return errors;
}

export function deliveryChanges(order: AdminOrder, form: DeliveryForm): DeliveryUpdate {
    const changes: DeliveryUpdate = {};
    const locked = isAddressLocked(order.status);
    const text = (value: string) => value.trim();
    const nullable = (value: string) => (value.trim() === '' ? null : value.trim());

    if (!locked) {
        if (text(form.customer_name) !== order.customer_name.trim()) {
            changes.customer_name = text(form.customer_name);
        }
        if (normalizeMoroccanPhone(form.phone) !== order.phone_e164) {
            changes.phone = text(form.phone);
        }
        if (text(form.address) !== order.address.trim()) {
            changes.address = text(form.address);
        }
        if (nullable(form.delivery_notes) !== (order.delivery_notes?.trim() || null)) {
            changes.delivery_notes = nullable(form.delivery_notes);
        }
    }

    if (nullable(form.carrier) !== (order.carrier?.trim() || null)) {
        changes.carrier = nullable(form.carrier);
    }
    if (nullable(form.tracking_number) !== (order.tracking_number?.trim() || null)) {
        changes.tracking_number = nullable(form.tracking_number);
    }

    return changes;
}
