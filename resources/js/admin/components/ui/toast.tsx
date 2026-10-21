import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '@shared/format';
import { createStore, useStore } from '@shared/store';
import { errorText } from '../../lib/errors';

/**
 * Transient confirmations and failures. Messages are announced through two
 * permanently mounted live regions (polite for success/info, assertive for errors).
 */
export type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
    id: number;
    tone: ToastTone;
    message: string;
}

const toastStore = createStore<{ items: ToastItem[] }>({ items: [] });
let nextId = 1;

function push(tone: ToastTone, message: string): number {
    const id = nextId++;
    // The same message twice in a row (repeated submit) replaces the previous toast.
    toastStore.setState((state) => ({ items: [...state.items.filter((item) => item.message !== message).slice(-3), { id, tone, message }] }));

    return id;
}

export function dismissToast(id: number): void {
    toastStore.setState((state) => ({ items: state.items.filter((item) => item.id !== id) }));
}

export const toast = {
    success: (message: string) => push('success', message),
    info: (message: string) => push('info', message),
    error: (messageOrError: unknown) => push('error', typeof messageOrError === 'string' ? messageOrError : errorText(messageOrError)),
};

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const ICON_TONES = { success: 'text-success', error: 'text-danger', info: 'text-accent' } as const;

function ToastCard({ item }: { item: ToastItem }) {
    const Icon = ICONS[item.tone];
    const timer = useRef<number | null>(null);
    const duration = item.tone === 'error' ? 8000 : 4500;

    const stop = () => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    };
    const start = () => {
        stop();
        timer.current = window.setTimeout(() => dismissToast(item.id), duration);
    };

    useEffect(() => {
        const id = window.setTimeout(() => dismissToast(item.id), duration);
        timer.current = id;

        return () => window.clearTimeout(timer.current ?? id);
    }, [item.id, duration]);

    return (
        <motion.li
            layout
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, transition: { duration: 0.16 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onPointerEnter={stop}
            onPointerLeave={start}
            onFocus={stop}
            onBlur={start}
            className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line-strong bg-raised py-3 pl-4 pr-2 text-sm text-ink shadow-[0_16px_40px_-12px_rgb(var(--rp-shadow)/0.5)]"
        >
            <Icon className={cn('mt-0.5 size-4 shrink-0', ICON_TONES[item.tone])} aria-hidden />
            <p className="min-w-0 flex-1 py-px">{item.message}</p>
            <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="-my-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-ink/[0.06] hover:text-ink"
                aria-label="Fermer la notification"
            >
                <X className="size-3.5" aria-hidden />
            </button>
        </motion.li>
    );
}

export function ToastViewport() {
    const items = useStore(toastStore, (state) => state.items);
    const errors = items.filter((item) => item.tone === 'error');
    const others = items.filter((item) => item.tone !== 'error');

    return (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:px-6 lg:px-8">
            <ul aria-live="assertive" aria-relevant="additions" className="flex w-full max-w-sm flex-col gap-2">
                <AnimatePresence initial={false}>
                    {errors.map((item) => (
                        <ToastCard key={item.id} item={item} />
                    ))}
                </AnimatePresence>
            </ul>
            <ul aria-live="polite" aria-relevant="additions" className="flex w-full max-w-sm flex-col gap-2">
                <AnimatePresence initial={false}>
                    {others.map((item) => (
                        <ToastCard key={item.id} item={item} />
                    ))}
                </AnimatePresence>
            </ul>
        </div>
    );
}
