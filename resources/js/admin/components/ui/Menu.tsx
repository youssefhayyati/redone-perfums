import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@shared/format';

export interface MenuAction {
    label: string;
    icon?: ReactNode;
    onSelect: () => void;
    tone?: 'default' | 'danger';
}

/**
 * Menu button (WAI-ARIA menu pattern): opens on click, Enter, Space or ArrowDown,
 * moves with the arrow keys, closes on Escape, Tab or a click outside.
 */
export function Menu({
    trigger,
    triggerLabel,
    header,
    actions,
    align = 'right',
    triggerClassName,
}: {
    trigger: ReactNode;
    triggerLabel: string;
    header?: ReactNode;
    actions: MenuAction[];
    align?: 'left' | 'right';
    triggerClassName?: string;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const menuId = useId();

    useEffect(() => {
        if (!open) {
            return;
        }

        itemRefs.current[0]?.focus();

        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);

        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    const close = (restoreFocus = true) => {
        setOpen(false);
        if (restoreFocus) {
            buttonRef.current?.focus();
        }
    };

    const onMenuKeyDown = (event: KeyboardEvent) => {
        const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
        const index = items.indexOf(document.activeElement as HTMLButtonElement);

        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            items[(index + 1) % items.length]?.focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            items[(index - 1 + items.length) % items.length]?.focus();
        } else if (event.key === 'Home') {
            event.preventDefault();
            items[0]?.focus();
        } else if (event.key === 'End') {
            event.preventDefault();
            items[items.length - 1]?.focus();
        } else if (event.key === 'Tab') {
            close(false);
        }
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={triggerLabel}
                onClick={() => setOpen((value) => !value)}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
                className={triggerClassName}
            >
                {trigger}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        id={menuId}
                        role="menu"
                        aria-label={triggerLabel}
                        onKeyDown={onMenuKeyDown}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.14 }}
                        className={cn(
                            'absolute top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-line-strong bg-raised py-1 shadow-[0_16px_40px_-12px_rgb(var(--rp-shadow)/0.5)]',
                            align === 'right' ? 'right-0' : 'left-0',
                        )}
                    >
                        {header && <div className="border-b border-line px-4 py-3">{header}</div>}
                        {actions.map((action, index) => (
                            <button
                                key={action.label}
                                ref={(element) => {
                                    itemRefs.current[index] = element;
                                }}
                                type="button"
                                role="menuitem"
                                tabIndex={-1}
                                onClick={() => {
                                    close(false);
                                    action.onSelect();
                                }}
                                className={cn(
                                    'flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm outline-none transition-colors hover:bg-ink/[0.06] focus-visible:bg-ink/[0.06]',
                                    action.tone === 'danger' ? 'text-danger' : 'text-ink',
                                )}
                            >
                                {action.icon}
                                {action.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
