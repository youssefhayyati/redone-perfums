import { useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDateTime, plural } from '@shared/format';
import * as api from '../api';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/feedback';
import { AffixInput, ARABIC_PANEL_HINT, arabicText, Field, Segmented, Switch, TextArea, TextInput } from '../components/ui/form';
import { PageHeader, Panel } from '../components/ui/Panel';
import { DataTable, Td, Th } from '../components/ui/Table';
import { toast } from '../components/ui/toast';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { errorText, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../lib/errors';
import { parseLightMarkup, wordCount } from '../lib/markup';
import { slugify } from '../lib/slug';
import type { AdminPage } from '../types';

interface PageForm {
    title: string;
    slug: string;
    body: string;
    meta_description: string;
    title_ar: string;
    body_ar: string;
    meta_description_ar: string;
    is_published: boolean;
    sort_order: string;
}

type Language = 'fr' | 'ar';

/** The fields edited in each language; the slug, publication and order are shared. */
const COPY_FIELDS = {
    fr: { title: 'title', body: 'body', meta_description: 'meta_description' },
    ar: { title: 'title_ar', body: 'body_ar', meta_description: 'meta_description_ar' },
} as const;

const toForm = (page: AdminPage | null): PageForm => ({
    title: page?.title ?? '',
    slug: page?.slug ?? '',
    body: page?.body ?? '',
    meta_description: page?.meta_description ?? '',
    title_ar: page?.title_ar ?? '',
    body_ar: page?.body_ar ?? '',
    meta_description_ar: page?.meta_description_ar ?? '',
    is_published: page?.is_published ?? false,
    sort_order: String(page?.sort_order ?? 0),
});

const nullableText = (value: string): string | null => (value.trim() === '' ? null : value.trim());

/** The language holding the first error, so the editor shows the field to fix. */
function languageWithErrors(errors: FieldErrors, current: Language): Language {
    const inFrench = Object.values(COPY_FIELDS.fr).some((field) => errors[field]);
    const inArabic = Object.values(COPY_FIELDS.ar).some((field) => errors[field]);

    return inFrench ? 'fr' : inArabic ? 'ar' : current;
}

/** Preview of the light markup, rendered as text (never HTML) like the storefront. */
export function MarkupPreview({ body }: { body: string }) {
    const blocks = parseLightMarkup(body);

    if (blocks.length === 0) {
        return <p className="text-sm text-muted">Rien à prévisualiser pour l’instant.</p>;
    }

    return (
        <div className="flex max-w-prose flex-col gap-3 text-sm leading-relaxed text-ink">
            {blocks.map((block, index) =>
                block.type === 'heading' ? (
                    <h3 key={index} className="mt-3 text-base font-semibold first:mt-0">
                        {block.text}
                    </h3>
                ) : block.type === 'list' ? (
                    <ul key={index} className="flex list-disc flex-col gap-1 pl-5 marker:text-muted">
                        {block.items.map((item, itemIndex) => (
                            <li key={itemIndex}>{item}</li>
                        ))}
                    </ul>
                ) : (
                    <p key={index} className="whitespace-pre-line text-muted">
                        {block.lines.join('\n')}
                    </p>
                ),
            )}
        </div>
    );
}

function PageEditor({ page, open, onClose, onSaved }: { page: AdminPage | null; open: boolean; onClose: () => void; onSaved: (page: AdminPage) => void }) {
    const [form, setForm] = useState<PageForm>(() => toForm(page));
    const [initial, setInitial] = useState(() => JSON.stringify(toForm(page)));
    const [tab, setTab] = useState<'write' | 'preview'>('write');
    const [language, setLanguage] = useState<Language>('fr');
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const dirty = JSON.stringify(form) !== initial;

    useEffect(() => {
        if (open) {
            const next = toForm(page);
            setForm(next);
            setInitial(JSON.stringify(next));
            setErrors({});
            setTab('write');
            setLanguage('fr');
        }
    }, [open, page]);

    const set = <K extends keyof PageForm>(key: K, value: PageForm[K]) => setForm((current) => ({ ...current, [key]: value }));
    const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose());
    const arabic = language === 'ar';
    const fields = COPY_FIELDS[language];
    const copy = arabic ? arabicText : {};

    async function submit(event: FormEvent) {
        event.preventDefault();
        const local: FieldErrors = {};
        if (form.title.trim() === '') {
            local.title = 'Indiquez un titre.';
        }
        if (form.body.trim() === '') {
            local.body = 'Le contenu ne peut pas être vide.';
        }
        if (hasErrors(local)) {
            setErrors(local);
            setTab('write');
            setLanguage('fr');
            focusFirstInvalid();

            return;
        }
        setBusy(true);
        try {
            const payload = {
                title: form.title.trim(),
                slug: form.slug.trim(),
                body: form.body,
                meta_description: nullableText(form.meta_description),
                title_ar: nullableText(form.title_ar),
                body_ar: form.body_ar.trim() === '' ? null : form.body_ar,
                meta_description_ar: nullableText(form.meta_description_ar),
                is_published: form.is_published,
                sort_order: Number.parseInt(form.sort_order, 10) || 0,
            };
            const saved = page ? await api.pages.update(page.id, payload) : await api.pages.create(payload);
            onSaved(saved);
            toast.success(page ? 'Page enregistrée.' : 'Page créée.');
            onClose();
        } catch (error) {
            const invalid = toFieldErrors(error);
            setErrors(invalid);
            setTab('write');
            setLanguage((current) => languageWithErrors(invalid, current));
            if (!hasErrors(invalid)) {
                toast.error(errorText(error));
            }
            focusFirstInvalid();
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Dialog
                open={open}
                onClose={requestClose}
                busy={busy}
                size="xl"
                title={page ? `Modifier « ${page.title} »` : 'Nouvelle page'}
                footer={
                    <>
                        <span className="mr-auto text-xs text-muted">{plural(wordCount(form[fields.body]), 'mot')}</span>
                        <Button onClick={requestClose} disabled={busy}>
                            Annuler
                        </Button>
                        <Button type="submit" form="page-form" variant="primary" loading={busy}>
                            {page ? 'Enregistrer' : 'Créer la page'}
                        </Button>
                    </>
                }
            >
                <form id="page-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Segmented
                            label="Langue du texte"
                            value={language}
                            onChange={setLanguage}
                            options={[
                                { value: 'fr', label: 'Français' },
                                { value: 'ar', label: <span lang="ar">العربية</span> },
                            ]}
                        />
                        {arabic && <p className="text-xs text-muted">{ARABIC_PANEL_HINT}</p>}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field key={fields.title} label="Titre" required={!arabic} optional={arabic} error={errors[fields.title]}>
                            {(control) => (
                                <TextInput
                                    {...control}
                                    {...copy}
                                    value={form[fields.title]}
                                    maxLength={160}
                                    placeholder={arabic ? form.title : undefined}
                                    onChange={(event) => set(fields.title, event.target.value)}
                                    data-autofocus
                                />
                            )}
                        </Field>
                        <Field label="Identifiant d’URL" error={errors.slug} hint="Laissez vide pour le générer à partir du titre.">
                            {(control) => (
                                <AffixInput
                                    {...control}
                                    value={form.slug}
                                    prefix={<span className="text-xs">/pages/</span>}
                                    className="pl-16 font-mono text-xs"
                                    placeholder={slugify(form.title) || 'titre-de-la-page'}
                                    spellCheck={false}
                                    onChange={(event) => set('slug', event.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                />
                            )}
                        </Field>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-medium text-ink">
                                Contenu
                                {arabic ? <span className="ml-1 font-normal text-muted">(facultatif)</span> : <span className="ml-0.5 text-danger" aria-hidden>*</span>}
                            </span>
                            <Segmented
                                label="Mode d’édition"
                                size="sm"
                                value={tab}
                                onChange={setTab}
                                options={[
                                    { value: 'write', label: 'Rédiger' },
                                    { value: 'preview', label: 'Aperçu' },
                                ]}
                            />
                        </div>
                        {tab === 'write' ? (
                            <Field
                                key={fields.body}
                                label="Contenu"
                                labelHidden
                                error={errors[fields.body]}
                                hint="« ## Titre » pour un intertitre, « - élément » pour une liste, une ligne vide entre deux paragraphes."
                            >
                                {(control) => (
                                    <TextArea
                                        {...control}
                                        {...copy}
                                        rows={14}
                                        maxLength={60000}
                                        value={form[fields.body]}
                                        onChange={(event) => set(fields.body, event.target.value)}
                                        className={arabic ? 'text-[0.9375rem] leading-relaxed' : 'font-mono text-[0.8125rem] leading-relaxed'}
                                    />
                                )}
                            </Field>
                        ) : (
                            <div {...copy} className="min-h-72 rounded-lg border border-line bg-canvas/40 p-5">
                                <MarkupPreview body={form[fields.body]} />
                            </div>
                        )}
                    </div>
                    <Field key={fields.meta_description} label="Description SEO" optional error={errors[fields.meta_description]} counter={{ value: form[fields.meta_description].length, max: 320 }}>
                        {(control) => (
                            <TextArea
                                {...control}
                                {...copy}
                                rows={2}
                                maxLength={320}
                                value={form[fields.meta_description]}
                                placeholder={arabic ? form.meta_description : undefined}
                                onChange={(event) => set(fields.meta_description, event.target.value)}
                            />
                        )}
                    </Field>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <Switch checked={form.is_published} onChange={(value) => set('is_published', value)} label="Publiée" description="Visible sur la boutique et dans le pied de page." />
                        <Field label="Ordre d’affichage" error={errors.sort_order}>
                            {(control) => <TextInput {...control} inputMode="numeric" className="w-24 tabular-nums" value={form.sort_order} onChange={(event) => set('sort_order', event.target.value)} />}
                        </Field>
                    </div>
                </form>
            </Dialog>
            <ConfirmDialog
                open={confirmDiscard}
                onClose={() => setConfirmDiscard(false)}
                title="Abandonner les modifications ?"
                description="Le texte saisi depuis l’ouverture de l’éditeur sera perdu."
                confirmLabel="Abandonner"
                cancelLabel="Continuer la rédaction"
                onConfirm={() => {
                    setConfirmDiscard(false);
                    onClose();
                }}
            />
        </>
    );
}

export default function ContentPagesPage() {
    useDocumentTitle('Pages');
    const query = useApiQuery('pages', (signal) => api.pages.list(signal));
    const [editing, setEditing] = useState<AdminPage | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<AdminPage | null>(null);

    const upsert = (page: AdminPage) =>
        query.setData((current) => {
            const list = current ?? [];
            const next = list.some((item) => item.id === page.id) ? list.map((item) => (item.id === page.id ? page : item)) : [...list, page];

            return [...next].sort((a, b) => a.sort_order - b.sort_order);
        });

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Pages"
                description="Livraison, retours, conditions générales, confidentialité… rédigées en texte simple."
                actions={
                    <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                        Nouvelle page
                    </Button>
                }
            />
            <Panel padded={false}>
                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={5} columns={4} />
                ) : query.data.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="Aucune page"
                        description="Les pages légales sont requises avant d’ouvrir la boutique."
                        action={
                            <Button size="sm" variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                                Nouvelle page
                            </Button>
                        }
                    />
                ) : (
                    <DataTable caption="Pages de contenu">
                        <thead>
                            <tr>
                                <Th>Page</Th>
                                <Th>État</Th>
                                <Th hideBelow="md" align="right">
                                    Modifiée le
                                </Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </tr>
                        </thead>
                        <tbody>
                            {query.data.map((page) => (
                                <tr key={page.id} className="transition-colors hover:bg-ink/[0.03]">
                                    <Td>
                                        <button type="button" onClick={() => setEditing(page)} className="block max-w-80 truncate rounded text-left font-medium text-ink hover:text-accent">
                                            {page.title}
                                        </button>
                                        <span className="font-mono text-2xs text-muted">/pages/{page.slug}</span>
                                    </Td>
                                    <Td>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {page.is_published ? <Badge tone="success" dot>Publiée</Badge> : <Badge tone="muted" dot>Brouillon</Badge>}
                                            {!page.body_ar && <Badge tone="muted">Arabe à rédiger</Badge>}
                                        </div>
                                    </Td>
                                    <Td hideBelow="md" align="right" className="whitespace-nowrap text-xs tabular-nums text-muted">
                                        {formatDateTime(page.updated_at)}
                                    </Td>
                                    <Td align="right" className="whitespace-nowrap">
                                        {page.is_published && (
                                            <a
                                                href={`/pages/${page.slug}`}
                                                target="_blank"
                                                rel="noopener"
                                                className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-ink/[0.06] hover:text-ink"
                                                aria-label={`Voir « ${page.title} » sur la boutique (nouvel onglet)`}
                                                title="Voir sur la boutique"
                                            >
                                                <ExternalLink className="size-3.5" aria-hidden />
                                            </a>
                                        )}
                                        <IconButton icon={Pencil} size="sm" label={`Modifier ${page.title}`} onClick={() => setEditing(page)} />
                                        <IconButton icon={Trash2} size="sm" variant="danger" label={`Supprimer ${page.title}`} onClick={() => setDeleting(page)} />
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </DataTable>
                )}
            </Panel>

            <PageEditor
                page={editing}
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
                title={`Supprimer « ${deleting?.title ?? ''} » ?`}
                description="La page et son adresse disparaissent de la boutique. Cette action est définitive."
                confirmLabel="Supprimer"
                onConfirm={async () => {
                    if (!deleting) {
                        return;
                    }
                    await api.pages.remove(deleting.id);
                    query.setData((current) => current?.filter((item) => item.id !== deleting.id));
                    toast.success('Page supprimée.');
                }}
            />
        </div>
    );
}
