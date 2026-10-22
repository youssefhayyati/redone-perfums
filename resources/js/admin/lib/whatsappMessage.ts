import type { AdminOrder } from '../types';

type MessageOrder = Pick<AdminOrder, 'customer_name' | 'reference' | 'status' | 'locale' | 'total' | 'city' | 'carrier' | 'tracking_number' | 'payment_method' | 'payment_status'>;

const STORE = 'Myperfum';

/** "930 DH" or "930 درهم": the customer's currency word, the same digits. */
function amount(centimes: number, locale: MessageOrder['locale']): string {
    // English customers read "1,250"; French and Arabic ones "1 250", as on their storefront.
    const value = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR', { maximumFractionDigits: centimes % 100 === 0 ? 0 : 2 }).format(centimes / 100);

    return `${value} ${locale === 'ar' ? 'درهم' : 'DH'}`;
}

/**
 * The WhatsApp message staff open from an order, ready to send: written for the order's
 * status (to confirm it, announce the shipment with the cash to prepare, thank, or explain
 * a cancellation) and in the language the customer ordered in.
 */
export function whatsappMessage(order: MessageOrder): string {
    const name = order.customer_name.trim().split(/\s+/)[0] ?? '';
    const total = amount(order.total, order.locale);
    const cashDue = order.payment_method === 'cod' && order.payment_status !== 'paid';

    if (order.locale === 'ar') {
        const hello = `مرحبًا ${name}، معك ${STORE}.`;
        switch (order.status) {
            case 'pending':
                return `${hello} توصلنا بطلبك ${order.reference} (${total}، التوصيل إلى ${order.city}). هل يمكنك تأكيد الطلب؟`;
            case 'confirmed':
            case 'processing':
                return `${hello} تم تأكيد طلبك ${order.reference}، ونحن نجهّز طردك.`;
            case 'shipped':
                return [
                    `${hello} طلبك ${order.reference} في الطريق إليك${order.carrier ? ` مع ${order.carrier}` : ''}${order.tracking_number ? ` (رقم التتبّع: ${order.tracking_number})` : ''}.`,
                    cashDue ? `يُرجى تحضير ${total} نقدًا عند الاستلام.` : '',
                ].filter(Boolean).join(' ');
            case 'delivered':
                return `${hello} شكرًا على طلبك ${order.reference}! هل أعجبتك العطور؟`;
            default:
                return `${hello} تم إلغاء طلبك ${order.reference}. لا تتردد في مراسلتنا لأي سؤال.`;
        }
    }

    if (order.locale === 'en') {
        const hello = `Hello ${name}, this is ${STORE}.`;
        switch (order.status) {
            case 'pending':
                return `${hello} We have received your order ${order.reference} (${total}, delivery to ${order.city}). Could you confirm it for us?`;
            case 'confirmed':
            case 'processing':
                return `${hello} Your order ${order.reference} is confirmed: we are preparing your parcel.`;
            case 'shipped':
                return [
                    `${hello} Your order ${order.reference} is on its way${order.carrier ? ` with ${order.carrier}` : ''}${order.tracking_number ? ` (tracking: ${order.tracking_number})` : ''}.`,
                    cashDue ? `Please have ${total} ready in cash for the delivery.` : '',
                ].filter(Boolean).join(' ');
            case 'delivered':
                return `${hello} Thank you for your order ${order.reference}! Are you enjoying your perfumes?`;
            default:
                return `${hello} Your order ${order.reference} has been cancelled. Feel free to write to us with any question.`;
        }
    }

    const hello = `Bonjour ${name}, ici ${STORE}.`;
    switch (order.status) {
        case 'pending':
            return `${hello} Nous avons bien reçu votre commande ${order.reference} (${total}, livraison à ${order.city}). Pouvez-vous nous la confirmer ?`;
        case 'confirmed':
        case 'processing':
            return `${hello} Votre commande ${order.reference} est confirmée : nous préparons votre colis.`;
        case 'shipped':
            return [
                `${hello} Votre commande ${order.reference} est en route${order.carrier ? ` avec ${order.carrier}` : ''}${order.tracking_number ? ` (suivi : ${order.tracking_number})` : ''}.`,
                cashDue ? `Prévoyez ${total} en espèces à la livraison.` : '',
            ].filter(Boolean).join(' ');
        case 'delivered':
            return `${hello} Merci pour votre commande ${order.reference} ! Vos parfums vous plaisent-ils ?`;
        default:
            return `${hello} Votre commande ${order.reference} a été annulée. N’hésitez pas à nous écrire pour toute question.`;
    }
}
