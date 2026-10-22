import { useParams } from 'react-router';
import { formatDate } from '@shared/format';
import { api } from '../api';
import { RichText } from '../components/RichText';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import NotFoundPage from './NotFoundPage';
import { t } from '../i18n';

export default function ContentPage() {
    const { slug = '' } = useParams();
    const { data, error, refetch } = useQuery(`page:${slug}`, (signal) => api.page(slug, { signal }));
    const page = data?.data;
    useHead({ title: page?.title, description: page?.meta_description });

    if (error?.isNotFound) {
        return <NotFoundPage />;
    }

    if (error && !page) {
        return <ErrorState message={error.message} onRetry={refetch} />;
    }

    return (
        <article className="container-page max-w-3xl pt-16 sm:pt-24">
            {page ? (
                <>
                    <PageHeader label={t('Informations')} title={page.title} meta={page.updated_at ? t('Mis à jour le {date}', { date: formatDate(page.updated_at) }) : null} />
                    <RichText source={page.body} className="pt-10" />
                </>
            ) : (
                <div className="flex flex-col gap-5" role="status" aria-label={t('Chargement')}>
                    <div className="skeleton h-3 w-24" />
                    <div className="skeleton h-14 w-2/3" />
                    <div className="skeleton mt-8 h-40 w-full" />
                </div>
            )}
        </article>
    );
}
