import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { plural } from '@shared/format';
import { api } from '../api';
import { ProductCard } from '../components/product/ProductCard';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { Reveal, RevealGroup, RevealItem } from '../motion/Reveal';

export default function DiscoverPage() {
    const { data, error, refetch } = useQuery('families', (signal) => api.families({ signal }));
    useHead({ title: 'Guide olfactif', description: 'Les familles olfactives de la maison, pour trouver le parfum qui vous ressemble.' });
    const families = data?.data ?? [];

    return (
        <div className="container-page pt-12 sm:pt-16">
            <header className="grid grid-cols-1 gap-8 border-b border-line pb-12 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="flex max-w-3xl flex-col gap-5">
                    <p className="eyebrow">Guide olfactif</p>
                    <h1 className="font-display text-display-lg text-balance">Trouvez le parfum qui vous ressemble.</h1>
                    <p className="max-w-xl text-muted">Les parfums se rangent en familles, selon la matière qui domine leur caractère. Commencez par celle qui vous attire, puis laissez-vous surprendre.</p>
                </div>
                {families.length > 0 && (
                    <nav aria-label="Familles olfactives">
                        <ul className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                            {families.map((family) => (
                                <li key={family.slug}>
                                    <a href={`#${family.slug}`} className="inline-flex border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-ink hover:text-ink">
                                        {family.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
            </header>

            {error && !data ? (
                <ErrorState message={error.message} onRetry={refetch} />
            ) : !data ? (
                <div className="flex flex-col gap-6 py-16" role="status" aria-label="Chargement">
                    <div className="skeleton h-10 w-1/3" />
                    <div className="skeleton h-64 w-full" />
                </div>
            ) : families.length === 0 ? (
                <EmptyState title="Le guide arrive bientôt" />
            ) : (
                <div className="flex flex-col divide-y divide-line">
                    {families.map((family, index) => (
                        <section key={family.slug} id={family.slug} className="grid grid-cols-1 scroll-mt-24 gap-10 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:gap-16" aria-labelledby={`family-${family.slug}`}>
                            <Reveal className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
                                <span className="font-display text-lg text-accent tabular-nums lining-nums">{String(index + 1).padStart(2, '0')}</span>
                                <h2 id={`family-${family.slug}`} className="font-display text-display-md">
                                    {family.name}
                                </h2>
                                {family.description && <p className="text-muted">{family.description}</p>}
                                <Link to={`/boutique?famille=${family.slug}`} className="link-draw inline-flex items-center gap-2 self-start text-2xs font-medium tracking-[0.2em] uppercase">
                                    {plural(family.products_count, 'parfum')} <ArrowRight className="size-3.5" strokeWidth={1.5} />
                                </Link>
                            </Reveal>
                            <RevealGroup as="ul" className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3">
                                {family.products.map((product) => (
                                    <RevealItem as="li" key={product.id}>
                                        <ProductCard product={product} />
                                    </RevealItem>
                                ))}
                            </RevealGroup>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
