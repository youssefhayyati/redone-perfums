import { api } from '../api';
import { CollectionTiles } from '../components/CollectionTiles';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { t, tn } from '../i18n';

export default function CollectionsPage() {
    const { data, error, refetch } = useQuery('collections', (signal) => api.collections({ signal }));
    useHead({ title: t('Les collections') });

    return (
        <div className="container-page pt-12 sm:pt-16">
            <PageHeader label={t('Les collections')} title={t('Des univers à explorer')} meta={data ? tn(data.data.length, 'univers') : null}>
                <p className="max-w-xl text-muted">{t('Chaque collection réunit des parfums qui partagent une lumière, une matière ou un moment de la journée.')}</p>
            </PageHeader>
            <div className="pt-12">
                {error && !data ? (
                    <ErrorState message={error.message} onRetry={refetch} />
                ) : !data ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label={t('Chargement')}>
                        {[0, 1, 2, 3].map((index) => (
                            <div key={index} className="skeleton aspect-[3/4]" />
                        ))}
                    </div>
                ) : data.data.length === 0 ? (
                    <EmptyState title={t('Bientôt de nouvelles collections')} />
                ) : (
                    <CollectionTiles collections={data.data} />
                )}
            </div>
        </div>
    );
}
