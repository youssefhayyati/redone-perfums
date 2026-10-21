import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Search, X } from 'lucide-react';
import { formatPriceFrom } from '@shared/money';
import { api } from '../../api';
import { useConfig } from '../../config';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useOverlay } from '../../hooks/useOverlay';
import { useQuery } from '../../hooks/useQuery';
import { EASE_LUXE } from '../../motion/easing';
import { ui, useUi } from '../../stores/ui';
import { ProductImage } from '../ui/ProductImage';
import { Spinner } from '../ui/Spinner';

function SearchResults({ term }: { term: string }) {
    const debounced = useDebouncedValue(term.trim(), 220);
    const ready = debounced.length >= 2;
    const { data, fetching } = useQuery(ready ? `search:${debounced}` : null, (signal) => api.products({ q: debounced, per_page: 6 }, { signal }), {
        keepPrevious: true,
    });
    const config = useConfig();

    if (!ready) {
        return (
            <div className="flex flex-col gap-4">
                <p className="eyebrow">Explorer</p>
                <ul className="flex flex-wrap gap-2">
                    {[{ name: 'Tous les parfums', to: '/boutique' }, ...config.collections.map((c) => ({ name: c.name, to: `/collections/${c.slug}` })), { name: 'Guide olfactif', to: '/decouvrir' }].map(
                        (link) => (
                            <li key={link.to}>
                                <Link to={link.to} className="inline-flex border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-ink hover:text-ink">
                                    {link.name}
                                </Link>
                            </li>
                        ),
                    )}
                </ul>
            </div>
        );
    }

    const results = data?.data ?? [];

    return (
        <div className="flex flex-col gap-4" aria-busy={fetching}>
            <div className="flex items-center justify-between">
                <p className="eyebrow" aria-live="polite">
                    {fetching && !data ? 'Recherche…' : results.length > 0 ? `${data?.meta.total} résultat${(data?.meta.total ?? 0) > 1 ? 's' : ''}` : 'Aucun parfum ne correspond'}
                </p>
                {fetching && <Spinner className="size-4 text-muted" />}
            </div>
            {results.length > 0 && (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {results.map((product) => (
                        <li key={product.id}>
                            <Link to={`/parfums/${product.slug}`} className="group flex items-center gap-4 p-2 transition-colors hover:bg-raised">
                                <span className="aura flex size-16 shrink-0 items-center justify-center" style={product.accent_color ? ({ '--aura': product.accent_color } as CSSProperties) : undefined}>
                                    <ProductImage image={product.image} alt="" sizes="64px" className="size-full p-1.5" />
                                </span>
                                <span className="flex min-w-0 flex-col gap-1">
                                    <span className="font-display text-lg leading-tight group-hover:text-accent">{product.name}</span>
                                    <span className="truncate text-xs text-muted">
                                        {[product.family?.name, formatPriceFrom(product.price_from, product.has_price_range)].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {(data?.meta.total ?? 0) > results.length && (
                <Link to={`/boutique?q=${encodeURIComponent(debounced)}`} className="link-draw inline-flex items-center gap-2 self-start text-sm">
                    Voir tous les résultats <ArrowRight className="size-4" strokeWidth={1.25} />
                </Link>
            )}
        </div>
    );
}

export function SearchOverlay() {
    const open = useUi((state) => state.overlay === 'search');
    const panel = useRef<HTMLDivElement>(null);
    const [term, setTerm] = useState('');
    const navigate = useNavigate();
    useOverlay(panel, open, ui.close);

    function submit(event: FormEvent) {
        event.preventDefault();
        const q = term.trim();
        if (q !== '') {
            ui.close();
            navigate(`/boutique?q=${encodeURIComponent(q)}`);
        }
    }

    return createPortal(
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50">
                    <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={ui.close} aria-hidden="true" />
                    <motion.div
                        ref={panel}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Rechercher un parfum"
                        className="relative max-h-[85dvh] overflow-y-auto border-b border-line bg-canvas"
                        initial={{ y: '-100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '-100%' }}
                        transition={{ duration: 0.55, ease: EASE_LUXE }}
                    >
                        <div className="container-page flex flex-col gap-10 py-8 sm:py-12">
                            <form role="search" onSubmit={submit} className="flex items-center gap-4 border-b border-line-strong pb-4">
                                <Search className="size-6 shrink-0 text-muted" strokeWidth={1} />
                                <label htmlFor="search-input" className="sr-only">
                                    Nom, note ou famille olfactive
                                </label>
                                <input
                                    id="search-input"
                                    data-autofocus
                                    type="search"
                                    autoComplete="off"
                                    value={term}
                                    onChange={(event) => setTerm(event.target.value)}
                                    placeholder="Ambre, rose, oud…"
                                    className="min-w-0 flex-1 bg-transparent font-display text-3xl outline-none placeholder:text-faint sm:text-5xl"
                                />
                                <button type="button" onClick={ui.close} className="inline-flex size-10 items-center justify-center text-muted hover:text-ink" aria-label="Fermer la recherche">
                                    <X className="size-5" strokeWidth={1.25} />
                                </button>
                            </form>
                            <SearchResults term={term} />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
