import { Link } from 'react-router';
import { Gift, Plus } from 'lucide-react';
import { plural } from '@shared/format';
import { formatMoney } from '@shared/money';
import * as api from '../../api';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/feedback';
import { PageHeader, Panel } from '../../components/ui/Panel';
import { DataTable, LinkRow, Td, Th } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { PACK_TYPE_LABELS } from '../../lib/status';

export default function PacksPage() {
    useDocumentTitle('Coffrets');
    const query = useApiQuery('packs', (signal) => api.packs.list(signal));

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Coffrets"
                description="Coffrets à composer par le client ou à composition fixe."
                actions={
                    <ButtonLink to="/coffrets/nouveau" variant="primary" icon={Plus}>
                        Nouveau coffret
                    </ButtonLink>
                }
            />
            <Panel padded={false}>
                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={3} columns={5} />
                ) : query.data.length === 0 ? (
                    <EmptyState
                        icon={Gift}
                        title="Aucun coffret"
                        description="Proposez des coffrets découverte ou des duos signature."
                        action={
                            <ButtonLink to="/coffrets/nouveau" size="sm" variant="primary" icon={Plus}>
                                Nouveau coffret
                            </ButtonLink>
                        }
                    />
                ) : (
                    <DataTable caption="Coffrets">
                        <thead>
                            <tr>
                                <Th>Coffret</Th>
                                <Th hideBelow="md">Composition</Th>
                                <Th hideBelow="sm">Tarif</Th>
                                <Th align="right">À partir de</Th>
                                <Th hideBelow="lg">État</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {query.data.map((pack) => (
                                <LinkRow key={pack.id} to={`/coffrets/${pack.id}`}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-sunken text-muted" aria-hidden>
                                                {pack.image_url ? <img src={pack.image_url} alt="" className="size-full object-cover" loading="lazy" /> : <Gift className="size-4" />}
                                            </span>
                                            <div className="min-w-0">
                                                <Link to={`/coffrets/${pack.id}`} className="block truncate rounded font-medium text-ink hover:text-accent">
                                                    {pack.name}
                                                </Link>
                                                <span className="line-clamp-1 text-xs text-muted">{pack.tagline ?? PACK_TYPE_LABELS[pack.type]}</span>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td hideBelow="md" className="text-sm">
                                        <span className="block text-ink">{PACK_TYPE_LABELS[pack.type]}</span>
                                        <span className="text-xs text-muted">
                                            {plural(pack.bottle_count, 'flacon')}
                                            {pack.type === 'custom' && pack.eligible_count !== null && pack.eligible_count !== undefined && ` · ${plural(pack.eligible_count, 'format éligible', 'formats éligibles')}`}
                                        </span>
                                    </Td>
                                    <Td hideBelow="sm" className="text-sm text-ink">
                                        {pack.pricing_label}
                                    </Td>
                                    <Td align="right" className="whitespace-nowrap font-medium tabular-nums">
                                        {pack.starting_price !== null ? formatMoney(pack.starting_price) : <span className="font-normal text-muted">—</span>}
                                    </Td>
                                    <Td hideBelow="lg">
                                        <div className="flex flex-wrap gap-1.5">
                                            {pack.is_active ? <Badge tone="success" dot>Actif</Badge> : <Badge tone="muted" dot>Inactif</Badge>}
                                            {pack.is_demo && <Badge tone="muted">Démo</Badge>}
                                        </div>
                                    </Td>
                                </LinkRow>
                            ))}
                        </tbody>
                    </DataTable>
                )}
            </Panel>
        </div>
    );
}
