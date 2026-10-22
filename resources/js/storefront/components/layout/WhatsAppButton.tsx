import { motion } from 'framer-motion';
import { useLocation } from 'react-router';
import { useConfig } from '../../config';
import { SocialIcon } from './SocialIcon';
import { t } from '../../i18n';

/** A chat with the store on WhatsApp (the app on phones), the message already typed. */
export function whatsappHref(number: string, message: string): string {
    return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

/**
 * WhatsApp within reach on every page once the store has a number (Settings → Contact).
 * Not on checkout, where nothing should pull the customer away from finishing.
 */
export function WhatsAppButton() {
    const { contact, store } = useConfig();
    const { pathname } = useLocation();

    if (!contact.whatsapp || pathname === '/commande') {
        return null;
    }

    return (
        <motion.a
            href={whatsappHref(contact.whatsapp, t('Bonjour {store}, j’ai une question.', { store: store.name }))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('Nous écrire sur WhatsApp (nouvel onglet)')}
            className="group fixed end-4 bottom-4 z-30 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 transition-[scale] duration-300 ease-spring hover:scale-105 sm:end-6 sm:bottom-6"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 1.2, type: 'spring', stiffness: 260, damping: 18 }}
        >
            <span
                aria-hidden="true"
                className="pointer-events-none absolute end-full me-3 hidden translate-x-2 rounded-full bg-ink px-3.5 py-2 text-xs whitespace-nowrap text-canvas opacity-0 shadow-md transition duration-300 ease-luxe group-hover:translate-x-0 group-hover:opacity-100 sm:block rtl:-translate-x-2"
            >
                {t('Une question ? Écrivez-nous')}
            </span>
            <SocialIcon network="whatsapp" className="size-7" />
        </motion.a>
    );
}
