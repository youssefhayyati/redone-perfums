import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@shared/format';
import { isRtl } from '@shared/locale';
import { useOverlay } from '../../hooks/useOverlay';
import { EASE_LUXE } from '../../motion/easing';
import { t } from '../../i18n';

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    /** Edge the panel slides from, following the reading direction (end = right in French). */
    side?: 'start' | 'end';
    className?: string;
    footer?: ReactNode;
    children: ReactNode;
}

/** Side panel dialog with backdrop, focus trap and Escape to close. */
export function Drawer({ open, onClose, title, side = 'end', className, footer, children }: DrawerProps) {
    const panel = useRef<HTMLDivElement>(null);
    useOverlay(panel, open, onClose);
    // Off-screen offset towards the panel's own edge: the end is on the left in Arabic.
    const fromRight = (side === 'end') !== isRtl();
    const offset = fromRight ? '100%' : '-100%';

    return createPortal(
        <AnimatePresence>
            {open && (
                <div className={cn('fixed inset-0 z-50 flex', side === 'end' ? 'justify-end' : 'justify-start')}>
                    <motion.div
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={panel}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="drawer-title"
                        tabIndex={-1}
                        className={cn(
                            'relative flex h-full w-full max-w-md flex-col bg-canvas shadow-2xl outline-none',
                            side === 'end' ? 'border-s border-line' : 'border-e border-line',
                            className,
                        )}
                        initial={{ x: offset }}
                        animate={{ x: 0 }}
                        exit={{ x: offset }}
                        transition={{ duration: 0.55, ease: EASE_LUXE }}
                    >
                        <header className="flex items-center justify-between border-b border-line px-6 py-4">
                            <h2 id="drawer-title" className="font-display text-2xl">
                                {title}
                            </h2>
                            <button type="button" onClick={onClose} className="-me-2 inline-flex size-10 items-center justify-center text-muted transition-colors hover:text-ink" aria-label={t('Fermer')}>
                                <X className="size-5" strokeWidth={1.25} />
                            </button>
                        </header>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
                        {footer && <footer className="border-t border-line px-6 py-5">{footer}</footer>}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
