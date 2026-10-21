import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../api';
import { Benefits } from '../components/Benefits';
import { CollectionTiles } from '../components/CollectionTiles';
import { ProductGrid, ProductGridSkeleton } from '../components/product/ProductGrid';
import { ErrorState, SectionHeading } from '../components/ui/States';
import { useConfig } from '../config';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { Hero } from './home/Hero';
import { PacksTeaser } from './home/PacksTeaser';
import { Story } from './home/Story';

export default function HomePage() {
    const config = useConfig();
    const { data, error, refetch } = useQuery('home', (signal) => api.home({ signal }));
    useHead({});

    if (error && !data) {
        return <ErrorState message={error.message} onRetry={refetch} />;
    }

    const heroProduct = data?.story?.product ?? data?.featured[0];

    return (
        <>
            <Hero hero={data?.hero} product={heroProduct} />

            <section className="container-page flex flex-col gap-12 py-20 sm:py-28" aria-labelledby="featured-title">
                <SectionHeading
                    id="featured-title"
                    eyebrow="La sélection"
                    title="Nos signatures"
                    action={
                        <Link to="/boutique" className="link-draw inline-flex items-center gap-2 text-2xs font-medium tracking-[0.2em] uppercase">
                            Toute la boutique <ArrowRight className="size-3.5" strokeWidth={1.5} />
                        </Link>
                    }
                />
                {data ? <ProductGrid products={data.featured.slice(0, 4)} /> : <ProductGridSkeleton count={4} />}
            </section>

            {data?.story && <Story story={data.story} />}

            {data && data.collections.length > 0 && (
                <section className="container-page flex flex-col gap-12 py-20 sm:py-28" aria-labelledby="collections-title">
                    <SectionHeading id="collections-title" eyebrow="Les collections" title="Des univers à explorer" />
                    <CollectionTiles collections={data.collections} />
                </section>
            )}

            {data && data.packs.length > 0 && <PacksTeaser packs={data.packs} products={data.featured} />}

            {config.benefits.length > 0 && (
                <section className="container-page pt-20 sm:pt-28" aria-label="Nos engagements">
                    <Benefits benefits={config.benefits} />
                </section>
            )}
        </>
    );
}
