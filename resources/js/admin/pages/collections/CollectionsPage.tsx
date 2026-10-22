import { Link } from 'react-router';
import { LayoutGrid, Plus } from 'lucide-react';
import { plural } from '@shared/format';
import * as api from '../../api';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/feedback';
import { PageHeader, Panel } from '../../components/ui/Panel';
import { DataTable, LinkRow, Td, Th } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function CollectionsPage() {
    useDocumentTitle('Collections');
    const query = useApiQuery('collections', (signal) => api.collections.list(signal));

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Collections"
                description="Sélections éditoriales mises en avant sur la boutique."
                actions={
                    <ButtonLink to="/collections/nouvelle" variant="primary" icon={Plus}>
                        Nouvelle collection
                    </ButtonLink>
                }
            />
            <Panel padded={false}>
                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={4} columns={4} />
                ) : query.data.length === 0 ? (
                    <EmptyState
                        icon={LayoutGrid}
                        title="Aucune collection"
                        description="Regroupez des parfums autour d’un thème, d’une saison ou d’une humeur."
                        action={
                            <ButtonLink to="/collections/nouvelle" size="sm" variant="primary" icon={Plus}>
                                Nouvelle collection
                            </ButtonLink>
                        }
                    />
                ) : (
                    <DataTable caption="Collections">
                        <thead>
                            <tr>
                                <Th>Collection</Th>
                                <Th align="right">Parfums</Th>
                                <Th hideBelow="sm">Affichage</Th>
                                <Th hideBelow="md" align="right">
                                    Ordre
                                </Th>
                            </tr>
                        </thead>
                        <tbody>
                            {query.data.map((collection) => (
                                <LinkRow key={collection.id} to={`/collections/${collection.id}`}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-sunken"
                                                style={!collection.image_url && collection.accent_color ? { backgroundColor: collection.accent_color } : undefined}
                                                aria-hidden
                                            >
                                                {collection.image_url && <img src={collection.image_url} alt="" className="size-full object-cover" loading="lazy" />}
                                            </span>
                                            <div className="min-w-0">
                                                <Link to={`/collections/${collection.id}`} className="block truncate rounded font-medium text-ink hover:text-accent">
                                                    {collection.name}
                                                </Link>
                                                <span className="line-clamp-1 text-xs text-muted">{collection.tagline ?? collection.slug}</span>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td align="right" className="whitespace-nowrap tabular-nums">
                                        {plural(collection.products_count ?? 0, 'parfum')}
                                    </Td>
                                    <Td hideBelow="sm">
                                        <div className="flex flex-wrap gap-1.5">
                                            {collection.is_visible ? <Badge tone="success" dot>Visible</Badge> : <Badge tone="muted" dot>Masquée</Badge>}
                                            {collection.is_featured && <Badge tone="accent">À la une</Badge>}
                                            {collection.is_demo && <Badge tone="muted">Démo</Badge>}
                                        </div>
                                    </Td>
                                    <Td hideBelow="md" align="right" className="tabular-nums text-muted">
                                        {collection.sort_order}
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
