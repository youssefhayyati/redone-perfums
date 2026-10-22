import { plural } from '@shared/format';
import { api } from '../api';
import { CollectionTiles } from '../components/CollectionTiles';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';

export default function CollectionsPage() {
    const { data, error, refetch } = useQuery('collections', (signal) => api.collections({ signal }));
    useHead({ title: 'Les collections' });

    return (
        <div className="container-page pt-12 sm:pt-16">
            <PageHeader label="Les collections" title="Des univers à explorer" meta={data ? plural(data.data.length, 'univers', 'univers') : null}>
                <p className="max-w-xl text-muted">Chaque collection réunit des parfums qui partagent une lumière, une matière ou un moment de la journée.</p>
            </PageHeader>
            <div className="pt-12">
                {error && !data ? (
                    <ErrorState message={error.message} onRetry={refetch} />
                ) : !data ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Chargement">
                        {[0, 1, 2, 3].map((index) => (
                            <div key={index} className="skeleton aspect-[3/4]" />
                        ))}
                    </div>
                ) : data.data.length === 0 ? (
                    <EmptyState title="Bientôt de nouvelles collections" />
                ) : (
                    <CollectionTiles collections={data.data} />
                )}
            </div>
        </div>
    );
}
