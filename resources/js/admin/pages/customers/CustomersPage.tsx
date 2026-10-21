import { Link } from 'react-router';
import { SearchX, Users } from 'lucide-react';
import { cn, formatShortDate } from '@shared/format';
import { formatMoney } from '@shared/money';
import * as api from '../../api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/feedback';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader, Panel } from '../../components/ui/Panel';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable, LinkRow, Td, Th } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useListParams } from '../../hooks/useListParams';
import { formatNumber } from '../../lib/format';
import { toApiQuery } from '../../lib/query';

const DEFAULTS = { search: '', page: 1 };

export default function CustomersPage() {
    useDocumentTitle('Clients');
    const [params, setParams, resetParams] = useListParams(DEFAULTS);
    const query = useApiQuery(JSON.stringify(params), (signal) => api.customers.list({ ...toApiQuery(params), per_page: 20 }, signal), { keepPrevious: true });

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Clients" description="Comptes clients inscrits. Les commandes sans compte se retrouvent depuis l’écran Commandes." />
            <Panel padded={false}>
                <div className="px-4 py-4 sm:px-5">
                    <SearchInput className="md:w-96" label="Rechercher un client" placeholder="Nom, e-mail ou téléphone" value={params.search} onChange={(search) => setParams({ search }, { replace: true })} />
                </div>
                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={8} columns={5} />
                ) : query.data.data.length === 0 ? (
                    params.search ? (
                        <EmptyState
                            icon={SearchX}
                            title="Aucun client ne correspond"
                            description="Le téléphone peut être saisi dans n’importe quel format (06…, +212…)."
                            action={
                                <Button size="sm" onClick={resetParams}>
                                    Effacer la recherche
                                </Button>
                            }
                        />
                    ) : (
                        <EmptyState icon={Users} title="Aucun client inscrit" description="Les clients qui créent un compte sur la boutique apparaîtront ici." />
                    )
                ) : (
                    <div aria-busy={query.fetching} className={cn('border-t border-line transition-opacity', query.fetching && 'opacity-60')}>
                        <DataTable caption="Clients">
                            <thead>
                                <tr>
                                    <Th>Client</Th>
                                    <Th hideBelow="md">Téléphone</Th>
                                    <Th align="right">Commandes</Th>
                                    <Th hideBelow="sm" align="right">
                                        Total dépensé
                                    </Th>
                                    <Th hideBelow="lg" align="right">
                                        Dernière commande
                                    </Th>
                                    <Th hideBelow="xl" align="right">
                                        Inscrit le
                                    </Th>
                                </tr>
                            </thead>
                            <tbody>
                                {query.data.data.map((customer) => (
                                    <LinkRow key={customer.id} to={`/clients/${customer.id}`}>
                                        <Td>
                                            <Link to={`/clients/${customer.id}`} className="block max-w-64 truncate rounded font-medium text-ink hover:text-accent">
                                                {customer.name}
                                            </Link>
                                            <span className="flex items-center gap-2 text-xs text-muted">
                                                <span className="max-w-60 truncate">{customer.email}</span>
                                                {!customer.is_active && <Badge tone="muted">Désactivé</Badge>}
                                            </span>
                                        </Td>
                                        <Td hideBelow="md" className="whitespace-nowrap tabular-nums text-muted">
                                            {customer.phone ?? '—'}
                                        </Td>
                                        <Td align="right" className="tabular-nums">
                                            {formatNumber(customer.orders_count)}
                                        </Td>
                                        <Td hideBelow="sm" align="right" className="whitespace-nowrap tabular-nums">
                                            {formatMoney(customer.total_spent)}
                                        </Td>
                                        <Td hideBelow="lg" align="right" className="whitespace-nowrap text-xs tabular-nums text-muted">
                                            {customer.last_order_at ? formatShortDate(customer.last_order_at) : '—'}
                                        </Td>
                                        <Td hideBelow="xl" align="right" className="whitespace-nowrap text-xs tabular-nums text-muted">
                                            {formatShortDate(customer.created_at)}
                                        </Td>
                                    </LinkRow>
                                ))}
                            </tbody>
                        </DataTable>
                        <Pagination meta={query.data.meta} onPage={(page) => setParams({ page })} noun="clients" />
                    </div>
                )}
            </Panel>
        </div>
    );
}
