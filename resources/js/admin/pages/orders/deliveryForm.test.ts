import { describe, expect, it } from 'vitest';
import type { AdminOrder, AdminOrderEvent } from '../../types';
import { deliveryChanges, deliveryFormFrom, isAddressLocked, validateDelivery } from './deliveryForm';
import { describeEvent } from './orderEvents';

const order = {
    reference: 'RP-1',
    status: 'confirmed',
    customer_name: 'Salma Benali',
    phone: '06 12 34 56 78',
    phone_e164: '+212612345678',
    address: '12 rue des Orangers',
    delivery_notes: null,
    carrier: null,
    tracking_number: null,
} as AdminOrder;

describe('deliveryChanges', () => {
    it('sends nothing when nothing changed, whatever the phone format', () => {
        const form = { ...deliveryFormFrom(order), phone: '+212 6 12 34 56 78' };
        expect(deliveryChanges(order, form)).toEqual({});
    });

    it('sends only edited fields, empty optionals as null', () => {
        const form = { ...deliveryFormFrom(order), address: ' 14 rue des Orangers ', carrier: 'Amana', delivery_notes: '  ' };
        expect(deliveryChanges(order, form)).toEqual({ address: '14 rue des Orangers', carrier: 'Amana' });
        expect(deliveryChanges({ ...order, carrier: 'Amana' }, { ...deliveryFormFrom(order), carrier: '' })).toEqual({ carrier: null });
    });

    it('never sends address fields once the order has shipped', () => {
        const shipped = { ...order, status: 'shipped' } as AdminOrder;
        expect(isAddressLocked('shipped')).toBe(true);
        expect(isAddressLocked('processing')).toBe(false);
        const form = { ...deliveryFormFrom(shipped), address: 'Ailleurs 123', tracking_number: 'AM123' };
        expect(deliveryChanges(shipped, form)).toEqual({ tracking_number: 'AM123' });
    });

    it('validates editable fields only', () => {
        const form = { ...deliveryFormFrom(order), phone: '0123', address: 'court' };
        expect(Object.keys(validateDelivery(form, false))).toEqual(['phone', 'address']);
        expect(validateDelivery(form, true)).toEqual({});
    });
});

describe('describeEvent', () => {
    const event = (patch: Partial<AdminOrderEvent>): AdminOrderEvent => ({ id: 1, type: 'status', from: null, to: null, note: null, user: null, created_at: '', ...patch });

    it('words status, payment and delivery events in French', () => {
        expect(describeEvent(event({ to: 'pending', note: 'Commande passée en ligne.' })).title).toBe('Commande passée');
        expect(describeEvent(event({ from: 'pending', to: 'confirmed' })).title).toBe('Statut : En attente → Confirmée');
        expect(describeEvent(event({ type: 'payment', from: 'unpaid', to: 'paid' })).title).toBe('Paiement : Non payée → Payée');
        expect(describeEvent(event({ type: 'delivery', note: 'Champs modifiés : address, tracking_number' })).detail).toBe('Modifié : adresse, numéro de suivi.');
    });
});
