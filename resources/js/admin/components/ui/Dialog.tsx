import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@shared/format';
import { focusableWithin, lockScroll } from '../../lib/dom';
import { IconButton } from './Button';

/* Only the top-most overlay reacts to Escape and Tab. */
const overlayStack: object[] = [];

/**
 * Modal behaviour shared by dialogs and drawers: locks page scroll, moves focus into
 * the panel ([data-autofocus] first), keeps Tab inside, closes on Escape and gives
 * focus back to the element that opened it.
 */
export function useModal(ref: RefObject<HTMLElement | null>, onClose: () => void): void {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        const token = {};
        overlayStack.push(token);
        const panel = ref.current;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const unlock = lockScroll();

        const initial = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? (panel ? focusableWithin(panel)[0] : null) ?? panel;
        initial?.focus({ preventScroll: true });

        function onKeyDown(event: KeyboardEvent): void {
            if (overlayStack[overlayStack.length - 1] !== token || !panel) {
                return;
            }

            if (event.key === 'Escape') {
                event.stopPropagation();
                event.preventDefault();
                onCloseRef.current();

                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const items = focusableWithin(panel);
            if (items.length === 0) {
                event.preventDefault();
                panel.focus();

                return;
            }

            const first = items[0]!;
            const last = items[items.length - 1]!;
            const active = document.activeElement;

            if (event.shiftKey && (active === first || !panel.contains(active))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            overlayStack.splice(overlayStack.indexOf(token), 1);
            unlock();
            if (previous && document.contains(previous)) {
                previous.focus({ preventScroll: true });
            }
        };
    }, [ref]);
}

const SIZES = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
} as const;

export interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
    size?: keyof typeof SIZES;
    /** While true, Escape, the backdrop and the close button do nothing. */
    busy?: boolean;
    /** `alertdialog` for confirmations. */
    role?: 'dialog' | 'alertdialog';
}

export function Dialog(props: DialogProps) {
    return createPortal(<AnimatePresence>{props.open && <DialogPanel key="dialog" {...props} />}</AnimatePresence>, document.body);
}

function DialogPanel({ onClose, title, description, children, footer, size = 'md', busy = false, role = 'dialog' }: DialogProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descriptionId = useId();
    const close = () => {
        if (!busy) {
            onClose();
        }
    };

    useModal(panelRef, close);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
            <motion.div
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={close}
                aria-hidden
            />
            <motion.div
                ref={panelRef}
                role={role}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.985 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                    'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line-strong bg-raised shadow-[0_24px_64px_-16px_rgb(var(--rp-shadow)/0.55)] outline-none sm:rounded-xl',
                    SIZES[size],
                )}
            >
                <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-base font-semibold text-ink">
                            {title}
                        </h2>
                        {description && (
                            <div id={descriptionId} className="mt-1 text-sm text-muted">
                                {description}
                            </div>
                        )}
                    </div>
                    <IconButton icon={X} label="Fermer" size="sm" onClick={close} disabled={busy} className="-mr-2 -mt-1" />
                </header>
                {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>}
                {footer && <footer className="flex flex-wrap-reverse items-center justify-end gap-2 border-t border-line bg-sunken/40 px-5 py-3">{footer}</footer>}
            </motion.div>
        </div>
    );
}
