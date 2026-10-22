import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import type { Pack, PackOption, PackQuote, Variant } from '@shared/types';
import { ApiError, isAbortError } from '@shared/http';
import { formatMoney } from '@shared/money';
import { cn } from '@shared/format';
import { api } from '../api';
import { PackOptionCard } from '../components/pack/PackOptionCard';
import { PackSlots, type SlotItem } from '../components/pack/PackSlots';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { ProductImage } from '../components/ui/ProductImage';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { EASE_LUXE } from '../motion/easing';
import { RevealWords } from '../motion/Reveal';
import { cartActions, useCart } from '../stores/cart';
import { toast, ui } from '../stores/ui';
import NotFoundPage from './NotFoundPage';
import { t, tn } from '../i18n';

function PackHeader({ pack, kind }: { pack: Pack; kind: string }) {
    const facts = [tn(pack.bottle_count, 'flacon'), pack.allowed_sizes?.length ? t('{sizes} ml', { sizes: pack.allowed_sizes.join(' / ') }) : null, pack.pricing.label].filter(Boolean);

    return (
        <header className="flex max-w-3xl flex-col gap-5">
            <p className="eyebrow">{kind}</p>
            <RevealWords as="h1" text={pack.name} className="font-display text-display-lg font-normal" />
            {pack.tagline && <p className="font-display text-2xl text-muted italic">{pack.tagline}</p>}
            {pack.description && <p className="max-w-xl text-muted">{pack.description}</p>}
            <ul className="flex flex-wrap gap-2 pt-1">
                {facts.map((fact) => (
                    <li key={fact} className="rounded-full border border-line px-3.5 py-1.5 text-xs text-muted">
                        {fact}
                    </li>
                ))}
            </ul>
        </header>
    );
}

function PriceSummary({ pack, full, quote, quoting, quoteError }: { pack: Pack; full: boolean; quote: PackQuote | null; quoting: boolean; quoteError: string | null }) {
    if (full && quoting && !quote) {
        return (
            <div className="flex items-center gap-3 text-sm text-muted" role="status">
                <Spinner className="size-4" /> {t('Calcul du prix…')}
            </div>
        );
    }

    if (full && quoteError) {
        return (
            <p role="alert" className="text-sm text-danger">
                {quoteError}
            </p>
        );
    }

    if (full && quote) {
        return (
            <div className="flex flex-col gap-1" aria-live="polite">
                <p className="flex items-baseline gap-3">
                    <span className="font-display text-4xl tabular-nums lining-nums">{formatMoney(quote.price)}</span>
                    {quote.compare_at > quote.price && (
                        <s className="text-sm text-muted tabular-nums">
                            <span className="sr-only">{t('au lieu de ')}</span>
                            {formatMoney(quote.compare_at)}
                        </s>
                    )}
                </p>
                {quote.savings > 0 && <p className="text-sm text-success">{t('Vous économisez {amount}', { amount: formatMoney(quote.savings) })}</p>}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <p className="font-display text-2xl">{pack.pricing.type === 'fixed' && pack.pricing.price !== null ? formatMoney(pack.pricing.price) : pack.pricing.label}</p>
            <p className="text-xs text-muted">{t('Le prix exact s’affiche dès que votre sélection est complète.')}</p>
        </div>
    );
}

function PackBuilder({ pack, options }: { pack: Pack; options: PackOption[] }) {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const editLineId = Number(params.get('ligne')) || null;
    const cart = useCart((state) => state.cart);
    const editLine = editLineId ? cart?.lines.find((line) => line.id === editLineId && line.type === 'pack' && line.pack?.id === pack.id) : undefined;

    const count = pack.selection_count ?? 0;
    const nextKey = useRef(1);
    const prefilled = useRef(false);
    const [items, setItems] = useState<SlotItem[]>([]);
    const [family, setFamily] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [quote, setQuote] = useState<PackQuote | null>(null);
    const [quoting, setQuoting] = useState(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);

    const byVariant = useMemo(() => {
        const map = new Map<number, { option: PackOption; variant: Variant }>();
        options.forEach((option) => option.pack_variants.forEach((variant) => map.set(variant.id, { option, variant })));

        return map;
    }, [options]);

    // Editing a pack already in the bag: start from its current composition.
    useEffect(() => {
        if (prefilled.current || !editLine || editLine.type !== 'pack' || !editLine.raw_selections) {
            return;
        }
        prefilled.current = true;
        setItems(
            editLine.raw_selections.flatMap((id) => {
                const entry = byVariant.get(id);

                return entry ? [{ key: nextKey.current++, ...entry }] : [];
            }),
        );
    }, [editLine, byVariant]);

    const full = count > 0 && items.length >= count;
    const ids = items.map((item) => item.variant.id);
    const idsKey = ids.join(',');

    // The server prices the composition; the figure shown is its answer.
    useEffect(() => {
        setQuote(null);
        setQuoteError(null);
        if (!full) {
            setQuoting(false);

            return;
        }

        const controller = new AbortController();
        setQuoting(true);
        const timer = window.setTimeout(() => {
            api.quotePack(pack.slug, idsKey.split(',').map(Number), { signal: controller.signal })
                .then(setQuote, (error: unknown) => {
                    if (!isAbortError(error)) {
                        setQuoteError(error instanceof ApiError ? error.message : t('Le prix n’a pas pu être calculé.'));
                    }
                })
                .finally(() => {
                    if (!controller.signal.aborted) {
                        setQuoting(false);
                    }
                });
        }, 150);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [idsKey, full, pack.slug]);

    const families = useMemo(() => {
        const seen = new Map<string, string>();
        options.forEach((option) => option.family && seen.set(option.family.slug, option.family.name));

        return [...seen.entries()];
    }, [options]);

    const term = search.trim().toLowerCase();
    const visible = options.filter(
        (option) =>
            (!family || option.family?.slug === family) &&
            (!term || option.name.toLowerCase().includes(term) || (option.notes && [...option.notes.top, ...option.notes.heart, ...option.notes.base].some((note) => note.toLowerCase().includes(term)))),
    );

    const shortages = quote?.out_of_stock.map((id) => byVariant.get(id)).filter(Boolean) ?? [];
    const canSubmit = full && quote !== null && shortages.length === 0 && !quoting;

    function pick(option: PackOption, variant: Variant) {
        if (!full) {
            setItems((current) => [...current, { key: nextKey.current++, option, variant }]);
        }
    }

    async function submit() {
        setSubmitting(true);
        try {
            if (editLine) {
                await cartActions.replaceSelections(editLine.id, ids);
                toast.success(t('Votre coffret a été mis à jour.'));
                navigate('/panier');
            } else {
                await cartActions.addPack(pack.id, ids);
                setItems([]);
                ui.open('cart');
            }
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t('Le coffret n’a pas pu être ajouté.'));
        } finally {
            setSubmitting(false);
        }
    }

    const panel = (
        <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between">
                <h2 className="font-display text-2xl">{editLine ? t('Modifier le coffret') : t('Votre coffret')}</h2>
                <p className="text-sm text-muted tabular-nums" aria-live="polite">
                    {items.length} / {count}
                </p>
            </div>
            <div className="h-px w-full bg-line" aria-hidden="true">
                <motion.div className="h-px bg-accent" initial={false} animate={{ width: `${count ? (items.length / count) * 100 : 0}%` }} transition={{ duration: 0.6, ease: EASE_LUXE }} />
            </div>
            <PackSlots count={count} items={items} onRemove={(key) => setItems((current) => current.filter((item) => item.key !== key))} />
            <PriceSummary pack={pack} full={full} quote={quote} quoting={quoting} quoteError={quoteError} />
            {shortages.length > 0 && (
                <p role="alert" className="text-sm text-warning">
                    {t('Stock insuffisant pour {items}.', { items: shortages.map((entry) => `${entry!.option.name} ${entry!.variant.label}`).join(t(', ')) })}
                </p>
            )}
            <Button size="lg" onClick={submit} loading={submitting} disabled={!canSubmit}>
                {editLine ? t('Mettre à jour le coffret') : full ? t('Ajouter au panier') : t('Choisissez encore {items}', { items: tn(count - items.length, 'parfum') })}
            </Button>
            {items.length > 0 && (
                <button type="button" onClick={() => setItems([])} className="link-draw self-center text-xs text-muted hover:text-ink">
                    {t('Vider la sélection')}
                </button>
            )}
        </div>
    );

    return (
        <div className="container-page pt-8 pb-28 sm:pt-12 lg:pb-0">
            <Breadcrumbs items={[{ label: t('Coffrets'), to: '/coffrets' }, { label: pack.name }]} />
            <div className="pt-8 pb-12">
                <PackHeader pack={pack} kind={editLine ? t('Modification de votre coffret') : t('Coffret à composer')} />
            </div>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-14">
                <section aria-labelledby="options-title" className="flex flex-col gap-8">
                    <h2 id="options-title" className="sr-only">
                        {t('Parfums disponibles')}
                    </h2>
                    <div className="flex flex-col gap-4 border-y border-line py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
                            {[[null, t('Tous')] as const, ...families].map(([slug, name]) => (
                                <button
                                    key={slug ?? 'all'}
                                    type="button"
                                    aria-pressed={family === slug}
                                    onClick={() => setFamily(slug)}
                                    className={cn('h-9 shrink-0 rounded-full border px-4 text-xs transition-colors', family === slug ? 'border-ink bg-ink text-canvas' : 'border-line-strong text-muted hover:text-ink')}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                        <label className="sm:w-56">
                            <span className="sr-only">{t('Rechercher dans le coffret')}</span>
                            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Nom ou note…')} className="field-control min-h-10 py-2 text-sm" />
                        </label>
                    </div>

                    {options.length === 0 ? (
                        <EmptyState title={t('Aucun parfum disponible pour ce coffret')}>
                            <p>{t('Revenez bientôt : la sélection est en cours de réassort.')}</p>
                        </EmptyState>
                    ) : visible.length === 0 ? (
                        <p className="py-12 text-center text-muted">{t('Aucun parfum ne correspond à ce filtre.')}</p>
                    ) : (
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 xl:grid-cols-3">
                            {visible.map((option) => (
                                <li key={option.id}>
                                    <PackOptionCard
                                        option={option}
                                        chosen={items.filter((item) => item.option.id === option.id).map((item) => item.variant.id)}
                                        full={full}
                                        allowDuplicates={pack.allow_duplicates}
                                        onPick={(variant) => pick(option, variant)}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <aside className="order-first lg:order-none" aria-label={t('Composition du coffret')}>
                    <div className="rounded-card border border-line bg-raised p-6 lg:sticky lg:top-24">{panel}</div>
                </aside>
            </div>

            {/* Mobile: progress and action always within reach. */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 px-5 py-3 backdrop-blur-md lg:hidden">
                <div className="flex items-center justify-between gap-4">
                    <div className="text-sm">
                        <p className="text-muted tabular-nums">
                            {items.length} / {count} parfums
                        </p>
                        {full && quote && <p className="tabular-nums">{formatMoney(quote.price)}</p>}
                    </div>
                    <Button onClick={submit} loading={submitting} disabled={!canSubmit}>
                        {editLine ? t('Mettre à jour') : t('Ajouter')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function FixedPack({ pack }: { pack: Pack }) {
    const [adding, setAdding] = useState(false);
    const available = pack.starting_price !== null;

    async function add() {
        setAdding(true);
        try {
            await cartActions.addPack(pack.id, []);
            ui.open('cart');
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t('Le coffret n’a pas pu être ajouté.'));
        } finally {
            setAdding(false);
        }
    }

    return (
        <div className="container-page pt-8 sm:pt-12">
            <Breadcrumbs items={[{ label: t('Coffrets'), to: '/coffrets' }, { label: pack.name }]} />
            <article className="grid grid-cols-1 gap-12 pt-8 lg:grid-cols-2 lg:gap-20">
                <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-raised lg:sticky lg:top-24 lg:self-start">
                    {pack.image && <img src={pack.image} alt={pack.name} className="absolute inset-0 size-full object-cover" />}
                </div>
                <div className="flex flex-col gap-10 lg:py-6">
                    <PackHeader pack={pack} kind={t('Coffret composé par la maison')} />

                    {pack.contents && pack.contents.length > 0 && (
                        <section aria-labelledby="contents-title" className="flex flex-col gap-4">
                            <h2 id="contents-title" className="eyebrow">
                                {t('Dans l’écrin')}
                            </h2>
                            <ul className="divide-y divide-line border-y border-line">
                                {pack.contents.map((content, index) => (
                                    <li key={index} className="flex items-center gap-4 py-4">
                                        <span className="aura flex size-16 shrink-0 items-center justify-center">
                                            <ProductImage image={content.product?.image} alt="" sizes="64px" className="size-full p-1.5" />
                                        </span>
                                        <span className="flex flex-1 flex-col gap-1">
                                            {content.product ? (
                                                <Link to={`/parfums/${content.product.slug}`} className="font-display text-xl hover:text-accent">
                                                    {content.product.name}
                                                </Link>
                                            ) : (
                                                <span className="font-display text-xl text-muted">{t('Parfum indisponible')}</span>
                                            )}
                                            <span className="text-xs text-muted">{content.variant?.label}</span>
                                        </span>
                                        {content.quantity > 1 && <span className="text-sm text-muted">× {content.quantity}</span>}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <div className="flex flex-col gap-5 border-b border-line pb-10">
                        {available ? (
                            <p className="flex items-baseline gap-3">
                                <span className="font-display text-4xl tabular-nums lining-nums">{formatMoney(pack.starting_price!)}</span>
                                <span className="text-sm text-accent">{pack.pricing.label}</span>
                            </p>
                        ) : (
                            <p className="text-muted">{t('Ce coffret est momentanément indisponible.')}</p>
                        )}
                        <Button size="lg" onClick={add} loading={adding} disabled={!available}>
                            {t('Ajouter au panier')}
                        </Button>
                    </div>
                </div>
            </article>
        </div>
    );
}

export default function PackPage() {
    const { slug = '' } = useParams();
    const { data, error, refetch } = useQuery(`pack:${slug}`, (signal) => api.pack(slug, { signal }));
    useHead({ title: data?.data.name, description: data?.data.tagline ?? data?.data.description });

    if (error?.isNotFound) {
        return <NotFoundPage />;
    }

    if (error && !data) {
        return <ErrorState message={error.message} onRetry={refetch} />;
    }

    if (!data) {
        return (
            <div className="container-page flex flex-col gap-6 pt-20" role="status" aria-label={t('Chargement du coffret')}>
                <div className="skeleton h-14 w-1/2" />
                <div className="skeleton h-6 w-1/3" />
                <div className="skeleton mt-8 h-96 w-full" />
            </div>
        );
    }

    // No transformed wrapper here: it would break the sticky panel and the fixed mobile bar.
    return data.data.type === 'custom' ? <PackBuilder key={data.data.id} pack={data.data} options={data.options} /> : <FixedPack pack={data.data} />;
}
