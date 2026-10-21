import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@shared/format';
import { useOverlay } from '../../hooks/useOverlay';
import { EASE_LUXE } from '../../motion/easing';

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    side?: 'left' | 'right';
    className?: string;
    footer?: ReactNode;
    children: ReactNode;
}

/** Side panel dialog with backdrop, focus trap and Escape to close. */
export function Drawer({ open, onClose, title, side = 'right', className, footer, children }: DrawerProps) {
    const panel = useRef<HTMLDivElement>(null);
    useOverlay(panel, open, onClose);

    return createPortal(
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex" style={{ justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
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
                            side === 'right' ? 'border-l border-line' : 'border-r border-line',
                            className,
                        )}
                        initial={{ x: side === 'right' ? '100%' : '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: side === 'right' ? '100%' : '-100%' }}
                        transition={{ duration: 0.55, ease: EASE_LUXE }}
                    >
                        <header className="flex items-center justify-between border-b border-line px-6 py-4">
                            <h2 id="drawer-title" className="font-display text-2xl">
                                {title}
                            </h2>
                            <button type="button" onClick={onClose} className="-mr-2 inline-flex size-10 items-center justify-center text-muted transition-colors hover:text-ink" aria-label="Fermer">
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
