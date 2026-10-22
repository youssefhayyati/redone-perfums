import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router';
import { useConfig } from '../../config';
import { EASE_LUXE } from '../../motion/easing';
import { ButtonLabel } from '../ui/Button';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { t } from '../../i18n';

/** A chat with the store on WhatsApp (the app on phones), the message already typed. */
export function whatsappHref(number: string, message: string): string {
    return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

/** On the homepage the hero has its own calls to action: the button waits until it is scrolled past. */
function usePastHero(active: boolean): boolean {
    const [past, setPast] = useState(() => !active || window.scrollY > window.innerHeight * 0.6);

    useEffect(() => {
        if (!active) {
            setPast(true);

            return;
        }
        const update = () => setPast(window.scrollY > window.innerHeight * 0.6);
        update();
        window.addEventListener('scroll', update, { passive: true });

        return () => window.removeEventListener('scroll', update);
    }, [active]);

    return past;
}

/**
 * WhatsApp within reach on every page once the store has a number (Settings → Contact),
 * styled like the storefront's round buttons: the accent rises through it on hover and it
 * leans towards the pointer. Not on checkout, where nothing should pull the customer away.
 */
export function WhatsAppButton() {
    const { contact, store } = useConfig();
    const { pathname } = useLocation();
    const pastHero = usePastHero(pathname === '/');

    return (
        <AnimatePresence>
            {contact.whatsapp && pathname !== '/commande' && pastHero && (
                <motion.div
                    key="whatsapp"
                    className="group fixed end-4 bottom-4 z-30 flex items-center gap-3 sm:end-6 sm:bottom-6"
                    initial={{ opacity: 0, y: 16, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.85, transition: { duration: 0.3 } }}
                    transition={{ delay: pathname === '/' ? 0 : 1.2, duration: 0.8, ease: EASE_LUXE }}
                >
                    <span
                        aria-hidden="true"
                        className="pointer-events-none hidden translate-x-2 rounded-full border border-line bg-raised/90 px-4 py-2 text-2xs font-medium tracking-[0.16em] whitespace-nowrap text-ink uppercase opacity-0 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.5)] backdrop-blur-md transition duration-500 ease-luxe group-hover:translate-x-0 group-hover:opacity-100 sm:block rtl:-translate-x-2"
                    >
                        {t('Une question ? Écrivez-nous')}
                    </span>
                    <a
                        href={whatsappHref(contact.whatsapp, t('Bonjour {store}, j’ai une question.', { store: store.name }))}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t('Nous écrire sur WhatsApp (nouvel onglet)')}
                        className="btn flex size-14 shrink-0 items-center justify-center rounded-full border border-line-strong bg-canvas/80 text-ink shadow-[0_14px_40px_-14px_rgb(0_0_0/0.6)] backdrop-blur-md [--btn-fill:var(--color-accent)] hover:border-accent hover:text-on-accent focus-visible:border-accent focus-visible:text-on-accent"
                    >
                        <ButtonLabel>
                            <WhatsAppIcon className="size-6" />
                        </ButtonLabel>
                    </a>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
