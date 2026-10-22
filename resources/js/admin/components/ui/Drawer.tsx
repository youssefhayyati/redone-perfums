import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@shared/format';
import { IconButton } from './Button';
import { useModal } from './Dialog';

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    /** Visible heading; pass `labelHidden` to keep it for screen readers only. */
    title: ReactNode;
    labelHidden?: boolean;
    description?: ReactNode;
    side?: 'left' | 'right';
    width?: string;
    children: ReactNode;
    footer?: ReactNode;
}

export function Drawer(props: DrawerProps) {
    return createPortal(<AnimatePresence>{props.open && <DrawerPanel key="drawer" {...props} />}</AnimatePresence>, document.body);
}

function DrawerPanel({ onClose, title, labelHidden = false, description, side = 'right', width = 'max-w-md', children, footer }: DrawerProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const offset = side === 'left' ? '-100%' : '100%';

    useModal(panelRef, onClose);

    return (
        <div className="fixed inset-0 z-50">
            <motion.div
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                aria-hidden
            />
            <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                initial={{ x: offset }}
                animate={{ x: 0 }}
                exit={{ x: offset }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                    'absolute inset-y-0 flex w-[88vw] flex-col border-line-strong bg-raised shadow-[0_0_48px_-12px_rgb(var(--rp-shadow)/0.6)] outline-none',
                    width,
                    side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
                )}
            >
                <header className={cn('flex items-start justify-between gap-4 px-5 py-4', !labelHidden && 'border-b border-line')}>
                    <div className={cn('min-w-0', labelHidden && 'sr-only')}>
                        <h2 id={titleId} className="text-base font-semibold text-ink">
                            {title}
                        </h2>
                        {description && <div className="mt-1 text-sm text-muted">{description}</div>}
                    </div>
                    <IconButton icon={X} label="Fermer" size="sm" onClick={onClose} className="-mr-2 ml-auto" />
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                {footer && <footer className="border-t border-line px-5 py-3">{footer}</footer>}
            </motion.div>
        </div>
    );
}
