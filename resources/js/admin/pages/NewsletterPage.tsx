import { Mail, SearchX } from 'lucide-react';
import { cn, formatDateTime } from '@shared/format';
import * as api from '../api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/feedback';
import { FilterTabs } from '../components/ui/FilterTabs';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader, Panel } from '../components/ui/Panel';
import { SearchInput } from '../components/ui/SearchInput';
import { DataTable, Td, Th } from '../components/ui/Table';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useListParams } from '../hooks/useListParams';
import { toApiQuery } from '../lib/query';
import { SUBSCRIBER_STATUS_LABELS } from '../lib/status';

const DEFAULTS = { status: '', search: '', page: 1 };
const ALLOWED = { status: ['', 'subscribed', 'unsubscribed'] };

const SOURCES: Record<string, string> = { footer: 'Pied de page', checkout: 'Commande', home: 'Accueil', popup: 'Fenêtre' };

export default function NewsletterPage() {
    useDocumentTitle('Newsletter');
    const [params, setParams, resetParams] = useListParams(DEFAULTS, ALLOWED);
    const query = useApiQuery(JSON.stringify(params), (signal) => api.newsletter.list({ ...toApiQuery(params), per_page: 25 }, signal), { keepPrevious: true });
    const counts = query.data?.counts;

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Newsletter" description="Adresses inscrites avec leur consentement, et désinscriptions." />
            <Panel padded={false}>
                <div className="flex flex-col gap-3 px-4 pt-3 sm:px-5">
                    <FilterTabs
                        label="Filtrer par statut"
                        value={params.status}
                        onChange={(status) => setParams({ status })}
                        tabs={[
                            { value: '', label: 'Toutes', count: counts ? counts.subscribed + counts.unsubscribed : undefined },
                            { value: 'subscribed', label: 'Inscrites', count: counts?.subscribed },
                            { value: 'unsubscribed', label: 'Désinscrites', count: counts?.unsubscribed },
                        ]}
                    />
                    <div className="pb-4 pt-1">
                        <SearchInput className="md:w-80" label="Rechercher une adresse" placeholder="Adresse e-mail" value={params.search} onChange={(search) => setParams({ search }, { replace: true })} />
                    </div>
                </div>
                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={8} columns={4} />
                ) : query.data.data.length === 0 ? (
                    params.search || params.status ? (
                        <EmptyState
                            icon={SearchX}
                            title="Aucune adresse ne correspond"
                            action={
                                <Button size="sm" onClick={resetParams}>
                                    Effacer les filtres
                                </Button>
                            }
                        />
                    ) : (
                        <EmptyState icon={Mail} title="Aucune inscription pour l’instant" description="Les inscriptions depuis la boutique apparaîtront ici." />
                    )
                ) : (
                    <div aria-busy={query.fetching} className={cn('transition-opacity', query.fetching && 'opacity-60')}>
                        <DataTable caption="Inscriptions à la newsletter">
                            <thead>
                                <tr>
                                    <Th>Adresse</Th>
                                    <Th>Statut</Th>
                                    <Th hideBelow="md">Origine</Th>
                                    <Th hideBelow="sm" align="right">
                                        Consentement
                                    </Th>
                                    <Th hideBelow="lg" align="right">
                                        Désinscription
                                    </Th>
                                </tr>
                            </thead>
                            <tbody>
                                {query.data.data.map((subscriber) => (
                                    <tr key={subscriber.id}>
                                        <Td className="max-w-72 truncate text-ink">{subscriber.email}</Td>
                                        <Td>
                                            <Badge tone={subscriber.status === 'subscribed' ? 'success' : 'muted'} dot>
                                                {SUBSCRIBER_STATUS_LABELS[subscriber.status] ?? subscriber.status}
                                            </Badge>
                                        </Td>
                                        <Td hideBelow="md" className="text-muted">
                                            {subscriber.source ? (SOURCES[subscriber.source] ?? subscriber.source) : '—'}
                                        </Td>
                                        <Td hideBelow="sm" align="right" className="whitespace-nowrap text-xs tabular-nums text-muted">
                                            {formatDateTime(subscriber.consented_at) || '—'}
                                        </Td>
                                        <Td hideBelow="lg" align="right" className="whitespace-nowrap text-xs tabular-nums text-muted">
                                            {formatDateTime(subscriber.unsubscribed_at) || '—'}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </DataTable>
                        <Pagination meta={query.data.meta} onPage={(page) => setParams({ page })} noun="adresses" />
                    </div>
                )}
            </Panel>
        </div>
    );
}
