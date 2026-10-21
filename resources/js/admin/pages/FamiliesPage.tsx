import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { plural } from '@shared/format';
import * as api from '../api';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/feedback';
import { AffixInput, Field, TextArea, TextInput } from '../components/ui/form';
import { PageHeader, Panel } from '../components/ui/Panel';
import { DataTable, Td, Th } from '../components/ui/Table';
import { toast } from '../components/ui/toast';
import { useApiQuery } from '../hooks/useApiQuery';
import { invalidateCatalogOptions } from '../hooks/useCatalogOptions';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { errorText, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../lib/errors';
import { slugify } from '../lib/slug';
import type { Family } from '../types';

interface FamilyForm {
    name: string;
    slug: string;
    description: string;
    sort_order: string;
}

function FamilyDialog({ family, open, onClose, onSaved }: { family: Family | null; open: boolean; onClose: () => void; onSaved: (family: Family) => void }) {
    const [form, setForm] = useState<FamilyForm>({ name: '', slug: '', description: '', sort_order: '0' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setForm({
                name: family?.name ?? '',
                slug: family?.slug ?? '',
                description: family?.description ?? '',
                sort_order: String(family?.sort_order ?? 0),
            });
            setErrors({});
        }
    }, [open, family]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (form.name.trim() === '') {
            setErrors({ name: 'Indiquez un nom.' });
            focusFirstInvalid();

            return;
        }
        setBusy(true);
        try {
            const payload = {
                name: form.name.trim(),
                slug: form.slug.trim(),
                description: form.description.trim() === '' ? null : form.description.trim(),
                sort_order: Number.parseInt(form.sort_order, 10) || 0,
            };
            const saved = family ? await api.families.update(family.id, payload) : await api.families.create(payload);
            invalidateCatalogOptions();
            onSaved(saved);
            toast.success(family ? 'Famille enregistrée.' : 'Famille créée.');
            onClose();
        } catch (error) {
            const fields = toFieldErrors(error);
            setErrors(fields);
            if (!hasErrors(fields)) {
                toast.error(errorText(error));
            }
            focusFirstInvalid();
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            busy={busy}
            title={family ? `Modifier « ${family.name} »` : 'Nouvelle famille olfactive'}
            footer={
                <>
                    <Button onClick={onClose} disabled={busy}>
                        Annuler
                    </Button>
                    <Button type="submit" form="family-form" variant="primary" loading={busy}>
                        {family ? 'Enregistrer' : 'Créer la famille'}
                    </Button>
                </>
            }
        >
            <form id="family-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                <Field label="Nom" required error={errors.name}>
                    {(control) => <TextInput {...control} value={form.name} maxLength={80} onChange={(event) => setForm({ ...form, name: event.target.value })} data-autofocus />}
                </Field>
                <Field label="Identifiant d’URL" error={errors.slug} hint="Laissez vide pour le générer à partir du nom.">
                    {(control) => (
                        <TextInput
                            {...control}
                            value={form.slug}
                            placeholder={slugify(form.name)}
                            spellCheck={false}
                            className="font-mono text-xs"
                            onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        />
                    )}
                </Field>
                <Field label="Description" optional error={errors.description} counter={{ value: form.description.length, max: 2000 }}>
                    {(control) => <TextArea {...control} rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />}
                </Field>
                <Field label="Ordre d’affichage" error={errors.sort_order}>
                    {(control) => <AffixInput {...control} inputMode="numeric" wrapperClassName="w-28" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} />}
                </Field>
            </form>
        </Dialog>
    );
}

export default function FamiliesPage() {
    useDocumentTitle('Familles olfactives');
    const query = useApiQuery('families', (signal) => api.families.list(signal));
    const [editing, setEditing] = useState<Family | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<Family | null>(null);
    const families = query.data ?? [];

    const upsert = (family: Family) =>
        query.setData((current) => {
            const list = current ?? [];
            const exists = list.some((item) => item.id === family.id);
            const merged = exists ? list.map((item) => (item.id === family.id ? { ...item, ...family } : item)) : [...list, { ...family, products_count: 0 }];

            return [...merged].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'fr'));
        });

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Familles olfactives"
                description="Classent les parfums sur la boutique (boisé, ambré, floral…)."
                actions={
                    <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                        Nouvelle famille
                    </Button>
                }
            />

            <Panel padded={false}>
                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={5} columns={4} />
                ) : families.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="Aucune famille olfactive"
                        description="Créez des familles pour aider vos clients à s’orienter."
                        action={
                            <Button size="sm" variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                                Nouvelle famille
                            </Button>
                        }
                    />
                ) : (
                    <DataTable caption="Familles olfactives">
                        <thead>
                            <tr>
                                <Th>Famille</Th>
                                <Th hideBelow="md">Description</Th>
                                <Th align="right">Parfums</Th>
                                <Th hideBelow="sm" align="right">
                                    Ordre
                                </Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </tr>
                        </thead>
                        <tbody>
                            {families.map((family) => (
                                <tr key={family.id} className="transition-colors hover:bg-ink/[0.03]">
                                    <Td>
                                        <span className="block font-medium text-ink">{family.name}</span>
                                        <span className="font-mono text-2xs text-muted">{family.slug}</span>
                                    </Td>
                                    <Td hideBelow="md" className="max-w-md text-muted">
                                        <span className="line-clamp-2">{family.description || '—'}</span>
                                    </Td>
                                    <Td align="right" className="whitespace-nowrap tabular-nums">
                                        {(family.products_count ?? 0) > 0 ? (
                                            <Link to={`/produits?family=${family.id}`} className="rounded text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                                                {plural(family.products_count ?? 0, 'parfum')}
                                            </Link>
                                        ) : (
                                            <span className="text-muted">0 parfum</span>
                                        )}
                                    </Td>
                                    <Td hideBelow="sm" align="right" className="tabular-nums text-muted">
                                        {family.sort_order}
                                    </Td>
                                    <Td align="right" className="whitespace-nowrap">
                                        <IconButton icon={Pencil} size="sm" label={`Modifier ${family.name}`} onClick={() => setEditing(family)} />
                                        <IconButton icon={Trash2} size="sm" variant="danger" label={`Supprimer ${family.name}`} onClick={() => setDeleting(family)} />
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </DataTable>
                )}
            </Panel>

            <FamilyDialog
                family={editing}
                open={creating || editing !== null}
                onClose={() => {
                    setCreating(false);
                    setEditing(null);
                }}
                onSaved={upsert}
            />
            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                title={`Supprimer « ${deleting?.name ?? ''} » ?`}
                description={
                    deleting && (deleting.products_count ?? 0) > 0
                        ? `${plural(deleting.products_count ?? 0, 'parfum est rattaché', 'parfums sont rattachés')} à cette famille ; ils resteront au catalogue, sans famille.`
                        : 'Aucun parfum n’est rattaché à cette famille.'
                }
                confirmLabel="Supprimer"
                onConfirm={async () => {
                    if (!deleting) {
                        return;
                    }
                    await api.families.remove(deleting.id);
                    invalidateCatalogOptions();
                    query.setData((current) => current?.filter((item) => item.id !== deleting.id));
                    toast.success('Famille supprimée.');
                }}
            />
        </div>
    );
}
