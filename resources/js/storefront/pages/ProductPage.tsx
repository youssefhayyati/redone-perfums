import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Banknote, Truck } from 'lucide-react';
import type { Product, Variant } from '@shared/types';
import { ApiError } from '@shared/http';
import { formatMoney } from '@shared/money';
import { api } from '../api';
import { Gallery } from '../components/product/Gallery';
import { NotesPyramid, hasNotes } from '../components/product/NotesPyramid';
import { BADGE_LABELS } from '../components/product/ProductCard';
import { ProductGrid } from '../components/product/ProductGrid';
import { ScaleDots } from '../components/product/ScaleDots';
import { VariantPicker } from '../components/product/VariantPicker';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { Price } from '../components/ui/Price';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { ErrorState, SectionHeading } from '../components/ui/States';
import { useConfig } from '../config';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { Reveal, RevealWords } from '../motion/Reveal';
import { cartActions } from '../stores/cart';
import { toast, ui } from '../stores/ui';
import NotFoundPage from './NotFoundPage';
import { t, tn } from '../i18n';

const GENDER_LABELS: Record<NonNullable<Product['gender']>, string> = { feminin: t('Féminin'), masculin: t('Masculin'), mixte: t('Mixte') };

/** The first variant that can be bought, otherwise the first one. */
function defaultVariant(variants: Variant[]): Variant | undefined {
    return variants.find((variant) => variant.availability !== 'out_of_stock') ?? variants[0];
}

function StockNote({ variant }: { variant: Variant | undefined }) {
    if (!variant) {
        return null;
    }

    if (variant.availability === 'out_of_stock') {
        return <p className="text-sm text-muted">{t('Ce format est épuisé pour le moment.')}</p>;
    }

    if (variant.availability === 'low_stock' && variant.stock_left !== null) {
        return (
            <p className="flex items-center gap-2 text-sm text-warning">
                <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
                {t(variant.stock_left === 1 ? 'Plus qu’un flacon disponible' : 'Plus que {count} flacons disponibles', { count: variant.stock_left, items: tn(variant.stock_left, 'flacon') })}
            </p>
        );
    }

    return (
        <p className="flex items-center gap-2 text-sm text-muted">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            {t('En stock')}
        </p>
    );
}

function ProductView({ product }: { product: Product }) {
    const config = useConfig();
    const [variantId, setVariantId] = useState<number | null>(() => defaultVariant(product.variants)?.id ?? null);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const variant = product.variants.find((item) => item.id === variantId);
    const soldOut = !variant || variant.availability === 'out_of_stock';
    const maxQuantity = Math.min(10, variant?.stock_left ?? 10);
    const reassurance = config.benefits.filter((benefit) => benefit.icon === 'truck' || benefit.icon === 'banknote');

    async function addToCart() {
        if (!variant) {
            return;
        }

        setAdding(true);
        try {
            await cartActions.addVariant(variant.id, quantity);
            ui.open('cart');
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t('Ce parfum n’a pas pu être ajouté au panier.'));
        } finally {
            setAdding(false);
        }
    }

    const facts = [product.concentration, product.gender ? GENDER_LABELS[product.gender] : null].filter(Boolean).join(' · ');

    return (
        <>
            <div className="container-page pt-8 sm:pt-12">
                <Breadcrumbs
                    items={[
                        { label: t('Boutique'), to: '/boutique' },
                        ...(product.family ? [{ label: product.family.name, to: `/boutique?famille=${product.family.slug}` }] : []),
                        { label: product.name },
                    ]}
                />
            </div>

            <article className="container-page grid grid-cols-1 gap-10 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20">
                <div className="lg:sticky lg:top-24 lg:self-start">
                    <Gallery images={product.images} name={product.name} accent={product.accent_color} />
                </div>

                <div className="flex flex-col gap-10 lg:py-6">
                    <header className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            {product.family && (
                                <Link to={`/boutique?famille=${product.family.slug}`} className="eyebrow transition-colors hover:text-ink">
                                    {product.family.name}
                                </Link>
                            )}
                            {product.badge && <span className="rounded-full border border-accent/50 px-2.5 py-0.5 text-2xs tracking-[0.18em] text-accent uppercase">{BADGE_LABELS[product.badge]}</span>}
                        </div>
                        <RevealWords as="h1" text={product.name} className="font-display text-display-lg font-normal" />
                        {facts && <p className="text-sm text-muted">{facts}</p>}
                        {product.tagline && <p className="font-display text-2xl text-muted italic">{product.tagline}</p>}
                    </header>

                    <div className="flex flex-col gap-8 border-y border-line py-8">
                        <Price amount={variant?.price ?? product.price_from} compareAt={variant?.compare_at_price} className="text-2xl" />

                        {product.variants.length > 0 && (
                            <VariantPicker
                                variants={product.variants}
                                value={variantId}
                                onChange={(id) => {
                                    setVariantId(id);
                                    setQuantity(1);
                                }}
                            />
                        )}

                        <StockNote variant={variant} />

                        <div className="flex gap-3">
                            <QuantityStepper value={quantity} max={Math.max(1, maxQuantity)} onChange={setQuantity} disabled={soldOut} />
                            <Button size="lg" className="min-w-0 flex-1 px-4" onClick={addToCart} loading={adding} disabled={soldOut}>
                                {soldOut ? (
                                    t('Épuisé')
                                ) : (
                                    <>
                                        <span className="sm:hidden">{t('Ajouter')}</span>
                                        <span className="hidden sm:inline">{t('Ajouter au panier')}</span>
                                        <span aria-hidden="true">—</span>
                                        <span className="tabular-nums">{formatMoney((variant?.price ?? 0) * quantity)}</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        {reassurance.length > 0 && (
                            <ul className="flex flex-col gap-3 text-sm text-muted">
                                {reassurance.map((benefit) => (
                                    <li key={benefit.title} className="flex items-start gap-3">
                                        {benefit.icon === 'truck' ? <Truck className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.25} /> : <Banknote className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.25} />}
                                        <span>{benefit.text}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {product.description && (
                        <section className="flex flex-col gap-4" aria-labelledby="description-title">
                            <h2 id="description-title" className="eyebrow">
                                {t('Le parfum')}
                            </h2>
                            <p className="text-lg leading-relaxed text-muted">{product.description}</p>
                        </section>
                    )}

                    {hasNotes(product.notes) && (
                        <section className="flex flex-col gap-4" aria-labelledby="notes-title">
                            <h2 id="notes-title" className="eyebrow">
                                {t('Pyramide olfactive')}
                            </h2>
                            <NotesPyramid notes={product.notes} />
                        </section>
                    )}

                    {(product.longevity !== null || product.sillage !== null) && (
                        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <ScaleDots label={t('Tenue')} value={product.longevity} kind="longevity" />
                            <ScaleDots label={t('Sillage')} value={product.sillage} kind="sillage" />
                        </dl>
                    )}

                    {product.collections.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="eyebrow me-2">{t('Collections')}</span>
                            {product.collections.map((collection) => (
                                <Link key={collection.slug} to={`/collections/${collection.slug}`} className="rounded-full border border-line px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-ink hover:text-ink">
                                    {collection.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </article>

            {product.inspiration && (
                <section className="container-page py-24 sm:py-32" aria-labelledby="inspiration-title">
                    <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
                        <span aria-hidden="true" className="h-12 w-px bg-accent" />
                        <h2 id="inspiration-title" className="eyebrow">
                            {t('L’inspiration')}
                        </h2>
                        <p className="font-display text-display-sm leading-snug text-balance italic">{product.inspiration}</p>
                    </Reveal>
                </section>
            )}
        </>
    );
}

export default function ProductPage() {
    const { slug = '' } = useParams();
    const { data, error, refetch } = useQuery(`product:${slug}`, (signal) => api.product(slug, { signal }));
    const product = data?.data;

    useHead({ title: product?.meta.title, description: product?.meta.description ?? product?.tagline });

    if (error?.isNotFound) {
        return <NotFoundPage />;
    }

    if (error && !data) {
        return <ErrorState message={error.message} onRetry={refetch} />;
    }

    if (!product) {
        return (
            <div className="container-page grid grid-cols-1 gap-10 pt-20 lg:grid-cols-2 lg:gap-20" role="status" aria-label="Chargement du parfum">
                <div className="skeleton aspect-[4/5]" />
                <div className="flex flex-col gap-5 pt-6">
                    <div className="skeleton h-3 w-24" />
                    <div className="skeleton h-14 w-3/4" />
                    <div className="skeleton h-6 w-1/2" />
                    <div className="skeleton mt-6 h-32 w-full" />
                </div>
            </div>
        );
    }

    return (
        <>
            <ProductView key={product.id} product={product} />
            {data.related.length > 0 && (
                <section className="container-page flex flex-col gap-12 pb-8" aria-labelledby="related-title">
                    <SectionHeading id="related-title" eyebrow={t('Dans le même esprit')} title={t('Vous aimerez aussi')} />
                    <ProductGrid products={data.related} />
                </section>
            )}
        </>
    );
}
