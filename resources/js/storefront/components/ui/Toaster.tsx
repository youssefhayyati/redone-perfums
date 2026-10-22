import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '@shared/format';
import { dismissToast, useUi } from '../../stores/ui';
import { EASE_LUXE } from '../../motion/easing';
import { t } from '../../i18n';

const icons = { success: CircleCheck, error: CircleAlert, info: Info };

export function Toaster() {
    const toasts = useUi((state) => state.toasts);

    return (
        <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
            <AnimatePresence initial={false}>
                {toasts.map((toast) => {
                    const Icon = icons[toast.tone];

                    return (
                        <motion.div
                            key={toast.id}
                            layout
                            role={toast.tone === 'error' ? 'alert' : 'status'}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.45, ease: EASE_LUXE }}
                            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-raised px-4 py-3.5 text-sm shadow-xl"
                        >
                            <Icon className={cn('mt-0.5 size-4 shrink-0', toast.tone === 'error' ? 'text-danger' : toast.tone === 'success' ? 'text-success' : 'text-accent')} strokeWidth={1.5} />
                            <p className="flex-1 text-ink">{toast.message}</p>
                            <button type="button" onClick={() => dismissToast(toast.id)} className="-m-1 p-1 text-muted hover:text-ink" aria-label={t('Fermer la notification')}>
                                <X className="size-4" strokeWidth={1.5} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
