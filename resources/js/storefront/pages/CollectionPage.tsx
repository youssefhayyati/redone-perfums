import { useParams } from 'react-router';
import { plural } from '@shared/format';
import { api } from '../api';
import { ProductGrid, ProductGridSkeleton } from '../components/product/ProductGrid';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { Reveal } from '../motion/Reveal';
import NotFoundPage from './NotFoundPage';

export default function CollectionPage() {
    const { slug = '' } = useParams();
    const { data, error, refetch } = useQuery(`collection:${slug}`, (signal) => api.collection(slug, { signal }));
    const collection = data?.data;
    useHead({ title: collection?.name, description: collection?.tagline ?? collection?.description });

    if (error?.isNotFound) {
        return <NotFoundPage />;
    }

    if (error && !collection) {
        return <ErrorState message={error.message} onRetry={refetch} />;
    }

    const products = collection?.products ?? [];

    return (
        <>
            <section className="grain relative overflow-hidden border-b border-line">
                {collection?.image && (
                    <img src={collection.image} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-30 dark:opacity-40" />
                )}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 -z-10"
                    style={{ background: `linear-gradient(to top, var(--color-canvas), color-mix(in oklab, var(--color-canvas) 55%, transparent))` }}
                />
                <div className="container-page flex flex-col gap-6 py-16 sm:py-24">
                    <Breadcrumbs items={[{ label: 'Collections', to: '/collections' }, { label: collection?.name ?? '…' }]} />
                    {collection ? (
                        <Reveal className="flex max-w-3xl flex-col gap-5">
                            <h1 className="font-display text-display-xl">{collection.name}</h1>
                            {collection.tagline && <p className="font-display text-2xl text-muted italic">{collection.tagline}</p>}
                            {collection.description && <p className="max-w-xl text-muted">{collection.description}</p>}
                            <p className="eyebrow pt-2">{plural(products.length, 'parfum')}</p>
                        </Reveal>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="skeleton h-20 w-2/3" />
                            <div className="skeleton h-6 w-1/3" />
                        </div>
                    )}
                </div>
            </section>

            <div className="container-page pt-14">
                {!collection ? (
                    <ProductGridSkeleton count={4} />
                ) : products.length === 0 ? (
                    <EmptyState title="Cette collection se prépare" action={<ButtonLink to="/boutique" variant="secondary">Voir la boutique</ButtonLink>}>
                        <p>Ses parfums seront bientôt disponibles.</p>
                    </EmptyState>
                ) : (
                    <ProductGrid products={products} />
                )}
            </div>
        </>
    );
}
