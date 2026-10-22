import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router';
import { setConsent, useConsent } from '../../analytics';
import { useConfig } from '../../config';
import { EASE_LUXE } from '../../motion/easing';
import { Button } from '../ui/Button';
import { t } from '../../i18n';

/**
 * Asks before any audience measurement is loaded. Only shown when the store has set up a
 * tracker; the choice is remembered and can be changed from the footer.
 */
export function CookieConsent() {
    const { analytics, pages } = useConfig();
    const { consent, asking } = useConsent();
    const configured = Boolean(analytics.ga4 || analytics.meta_pixel);
    const privacy = pages.find((page) => page.slug === 'confidentialite');

    return (
        <AnimatePresence>
            {configured && (consent === null || asking) && (
                <motion.section
                    aria-labelledby="cookies-title"
                    className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-lg rounded-card border border-line bg-raised/95 p-5 shadow-2xl backdrop-blur-md sm:bottom-6 sm:p-6"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.6, ease: EASE_LUXE, delay: consent === null ? 1 : 0 }}
                >
                    <h2 id="cookies-title" className="font-display text-2xl">
                        {t('Quelques cookies ?')}
                    </h2>
                    <p className="mt-2 text-sm text-muted">
                        {t('Nous mesurons la fréquentation de la boutique et l’efficacité de nos publicités (Google Analytics, Meta). Rien n’est enregistré sans votre accord.')}{' '}
                        {privacy && (
                            <Link to={`/pages/${privacy.slug}`} className="text-ink underline underline-offset-4">
                                {t('En savoir plus')}
                            </Link>
                        )}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Button size="sm" onClick={() => setConsent('granted')}>
                            {t('Accepter')}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setConsent('denied')}>
                            {t('Refuser')}
                        </Button>
                    </div>
                </motion.section>
            )}
        </AnimatePresence>
    );
}
