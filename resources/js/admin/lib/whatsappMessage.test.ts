import { describe, expect, it } from 'vitest';
import { whatsappMessage } from './whatsappMessage';

const order = {
    customer_name: 'Salma Benali',
    reference: 'RP-261021-AMBRE2',
    status: 'pending' as const,
    locale: 'fr' as const,
    total: 93000,
    city: 'Casablanca',
    carrier: null,
    tracking_number: null,
    payment_method: 'cod',
    payment_status: 'unpaid' as const,
};

describe('whatsappMessage', () => {
    it('asks a new customer to confirm their order, with its amount and city', () => {
        expect(whatsappMessage(order)).toBe('Bonjour Salma, ici Myperfum. Nous avons bien reçu votre commande RP-261021-AMBRE2 (930 DH, livraison à Casablanca). Pouvez-vous nous la confirmer ?');
    });

    it('announces a shipment with the carrier, the tracking number and the cash to prepare', () => {
        expect(whatsappMessage({ ...order, status: 'shipped', carrier: 'Amana', tracking_number: 'AM123' })).toBe(
            'Bonjour Salma, ici Myperfum. Votre commande RP-261021-AMBRE2 est en route avec Amana (suivi : AM123). Prévoyez 930 DH en espèces à la livraison.',
        );
    });

    it('asks for no cash once the order is paid', () => {
        expect(whatsappMessage({ ...order, status: 'shipped', payment_status: 'paid' })).not.toContain('Prévoyez');
    });

    it('writes to an Arabic customer in Arabic', () => {
        expect(whatsappMessage({ ...order, locale: 'ar', status: 'confirmed' })).toBe('مرحبًا Salma، معك Myperfum. تم تأكيد طلبك RP-261021-AMBRE2، ونحن نجهّز طردك.');
        expect(whatsappMessage({ ...order, locale: 'ar' })).toContain('930 درهم');
    });
});
