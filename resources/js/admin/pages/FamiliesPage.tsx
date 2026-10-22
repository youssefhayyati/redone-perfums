import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Check, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { plural } from '@shared/format';
import * as api from '../api';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState, Spinner, TableSkeleton } from '../components/ui/feedback';
import { FilterTabs } from '../components/ui/FilterTabs';
import { AffixInput, arabicText, Field, TextArea, TextInput } from '../components/ui/form';
import { PageHeader, Panel } from '../components/ui/Panel';
import { DataTable, Td, Th } from '../components/ui/Table';
import { toast } from '../components/ui/toast';
import { useApiQuery } from '../hooks/useApiQuery';
import { invalidateCatalogOptions } from '../hooks/useCatalogOptions';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { errorText, firstError, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../lib/errors';
import { slugify } from '../lib/slug';
import type { Family, NoteTranslation } from '../types';

interface FamilyForm {
    name: string;
    slug: string;
    description: string;
    name_ar: string;
    description_ar: string;
    sort_order: string;
}

const nullableText = (value: string): string | null => (value.trim() === '' ? null : value.trim());

function FamilyDialog({ family, open, onClose, onSaved }: { family: Family | null; open: boolean; onClose: () => void; onSaved: (family: Family) => void }) {
    const [form, setForm] = useState<FamilyForm>({ name: '', slug: '', description: '', name_ar: '', description_ar: '', sort_order: '0' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setForm({
                name: family?.name ?? '',
                slug: family?.slug ?? '',
                description: family?.description ?? '',
                name_ar: family?.name_ar ?? '',
                description_ar: family?.description_ar ?? '',
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
                description: nullableText(form.description),
                name_ar: nullableText(form.name_ar),
                description_ar: nullableText(form.description_ar),
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
                <Field label="Nom en arabe" optional error={errors.name_ar} hint="Laissé vide, le nom français s’affiche sur la boutique en arabe.">
                    {(control) => <TextInput {...control} {...arabicText} value={form.name_ar} maxLength={80} placeholder={form.name} onChange={(event) => setForm({ ...form, name_ar: event.target.value })} />}
                </Field>
                <Field label="Description en arabe" optional error={errors.description_ar} counter={{ value: form.description_ar.length, max: 2000 }}>
                    {(control) => <TextArea {...control} {...arabicText} rows={3} maxLength={2000} value={form.description_ar} onChange={(event) => setForm({ ...form, description_ar: event.target.value })} />}
                </Field>
                <Field label="Ordre d’affichage" error={errors.sort_order}>
                    {(control) => <AffixInput {...control} inputMode="numeric" wrapperClassName="w-28" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} />}
                </Field>
            </form>
        </Dialog>
    );
}

/** Arabic name of one note, saved when the field is left. */
function NoteNameField({ note, onSaved }: { note: NoteTranslation; onSaved: (note: NoteTranslation) => void }) {
    const [value, setValue] = useState(note.name_ar ?? '');
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [error, setError] = useState<string | null>(null);

    async function save() {
        const next = value.trim();
        if (next === (note.name_ar ?? '')) {
            return;
        }
        setStatus('saving');
        setError(null);
        try {
            const saved = await api.notes.translate(note.id, next === '' ? null : next);
            setValue(saved.name_ar ?? '');
            onSaved({ ...note, ...saved });
            setStatus('saved');
        } catch (failure) {
            setStatus('idle');
            setError(firstError(toFieldErrors(failure), 'name_ar') ?? errorText(failure));
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <TextInput
                    {...arabicText}
                    value={value}
                    maxLength={120}
                    aria-label={`Nom arabe de « ${note.name} »`}
                    aria-invalid={error ? true : undefined}
                    placeholder="—"
                    onChange={(event) => {
                        setValue(event.target.value);
                        setStatus('idle');
                    }}
                    onBlur={() => void save()}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur();
                        }
                    }}
                    className="min-w-0 flex-1"
                />
                <span className="flex size-4 shrink-0 items-center justify-center text-success" aria-live="polite">
                    {status === 'saving' && <Spinner label="Enregistrement…" />}
                    {status === 'saved' && (
                        <>
                            <Check className="size-4" aria-hidden />
                            <span className="sr-only">Enregistré</span>
                        </>
                    )}
                </span>
            </div>
            {error && (
                <p className="text-xs text-danger" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

function NoteTranslations() {
    const query = useApiQuery('note-translations', (signal) => api.notes.translations(signal));
    /** Notes listed under "À traduire", fixed when the tab is chosen so a row stays put once translated. */
    const [shownIds, setShownIds] = useState<Set<number> | null>(null);
    const notes = query.data ?? [];
    const missing = notes.filter((note) => !note.name_ar).length;
    const visible = shownIds === null ? notes : notes.filter((note) => shownIds.has(note.id));

    const replace = (note: NoteTranslation) => query.setData((current) => current?.map((item) => (item.id === note.id ? note : item)));

    return (
        <Panel title="Notes olfactives en arabe" description="Les notes naissent des pyramides des produits ; leur nom arabe s’enregistre dès que vous quittez le champ." padded={false}>
            {query.error && !query.data ? (
                <ErrorState error={query.error} onRetry={query.reload} />
            ) : !query.data ? (
                <TableSkeleton rows={4} columns={3} />
            ) : notes.length === 0 ? (
                <EmptyState icon={Layers} title="Aucune note" description="Ajoutez des notes à la pyramide d’un produit pour les traduire ici." />
            ) : (
                <>
                    <div className="px-4 pt-2 sm:px-5">
                        <FilterTabs
                            label="Filtrer les notes"
                            value={shownIds === null ? 'all' : 'missing'}
                            onChange={(filter) => setShownIds(filter === 'all' ? null : new Set(notes.filter((note) => !note.name_ar).map((note) => note.id)))}
                            tabs={[
                                { value: 'all', label: 'Toutes', count: notes.length },
                                { value: 'missing', label: 'À traduire', count: missing },
                            ]}
                        />
                    </div>
                    {visible.length === 0 ? (
                        <EmptyState icon={Check} title="Tout est traduit" description="Chaque note a son nom en arabe." />
                    ) : (
                        <DataTable caption="Noms arabes des notes olfactives">
                            <thead>
                                <tr>
                                    <Th>Note</Th>
                                    <Th>Nom en arabe</Th>
                                    <Th hideBelow="sm" align="right">
                                        Parfums
                                    </Th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((note) => (
                                    <tr key={note.id}>
                                        <Td className="font-medium text-ink">{note.name}</Td>
                                        <Td className="w-1/2 min-w-48">
                                            <NoteNameField note={note} onSaved={replace} />
                                        </Td>
                                        <Td hideBelow="sm" align="right" className="tabular-nums text-muted">
                                            {note.products_count}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </DataTable>
                    )}
                </>
            )}
        </Panel>
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
            <NoteTranslations />
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
