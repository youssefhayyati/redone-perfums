import { api } from '../api';
import { Benefits } from '../components/Benefits';
import { ErrorState } from '../components/ui/States';
import { useConfig } from '../config';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { Closing } from './home/Closing';
import { CollectionIndex } from './home/CollectionIndex';
import { Hero } from './home/Hero';
import { NotesMarquee } from './home/NotesMarquee';
import { PacksTeaser } from './home/PacksTeaser';
import { Signatures } from './home/Signatures';
import { Story } from './home/Story';

type Chapter = 'featured' | 'story' | 'collections' | 'packs';

export default function HomePage() {
    const config = useConfig();
    const { data, error, refetch } = useQuery('home', (signal) => api.home({ signal }));
    useHead({});

    if (error && !data) {
        return <ErrorState message={error.message} onRetry={refetch} />;
    }

    const heroProduct = data?.story?.product ?? data?.featured[0];
    const hasCollections = Boolean(data && data.collections.length > 0);
    const hasPacks = Boolean(data && data.packs.length > 0);

    // Chapters are numbered in page order, skipping those the store has nothing to show for.
    const chapters = (['featured', data?.story && 'story', hasCollections && 'collections', hasPacks && 'packs'] as const).filter((chapter): chapter is Chapter => Boolean(chapter));
    const numberOf = (chapter: Chapter) => String(chapters.indexOf(chapter) + 1).padStart(2, '0');

    return (
        <>
            <Hero hero={data?.hero} product={heroProduct} />

            {data && <NotesMarquee products={data.featured} />}

            <Signatures index={numberOf('featured')} products={data?.featured} />

            {data?.story && <Story index={numberOf('story')} story={data.story} />}

            {data && hasCollections && <CollectionIndex index={numberOf('collections')} collections={data.collections} />}

            {data && hasPacks && <PacksTeaser index={numberOf('packs')} packs={data.packs} products={data.featured} />}

            {config.benefits.length > 0 && (
                <section className="container-page pt-24 sm:pt-32" aria-label="Nos engagements">
                    <Benefits benefits={config.benefits} />
                </section>
            )}

            <Closing />
        </>
    );
}
