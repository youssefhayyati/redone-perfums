import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ExternalLink, Trash2 } from 'lucide-react';
import { ApiError } from '@shared/http';
import * as api from '../../api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState, Skeleton } from '../../components/ui/feedback';
import { ColorField, UnsavedChangesDialog } from '../../components/ui/fields';
import { AffixInput, ARABIC_PANEL_HINT, arabicText, ENGLISH_PANEL_HINT, englishText, Field, Switch, TextArea, TextInput } from '../../components/ui/form';
import { FormBar } from '../../components/ui/FormBar';
import { PageHeader, Panel } from '../../components/ui/Panel';
import { ImageField, ProductPicker } from '../../components/ui/pickers';
import { toast } from '../../components/ui/toast';
import { useApiQuery } from '../../hooks/useApiQuery';
import { invalidateCatalogOptions, useCatalogOptions } from '../../hooks/useCatalogOptions';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { errorText, firstError, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../../lib/errors';
import { slugify } from '../../lib/slug';
import type { AdminCollection, CatalogOptions, CollectionPayload } from '../../types';

interface CollectionForm {
    name: string;
    slug: string;
    tagline: string;
    description: string;
    name_ar: string;
    name_en: string;
    tagline_ar: string;
    tagline_en: string;
    description_ar: string;
    description_en: string;
    image_path: string | null;
    image_url: string | null;
    accent_color: string;
    is_visible: boolean;
    is_featured: boolean;
    sort_order: string;
    product_ids: number[];
}

function toForm(collection: AdminCollection | null): CollectionForm {
    return {
        name: collection?.name ?? '',
        slug: collection?.slug ?? '',
        tagline: collection?.tagline ?? '',
        description: collection?.description ?? '',
        name_ar: collection?.name_ar ?? '',
        name_en: collection?.name_en ?? '',
        tagline_ar: collection?.tagline_ar ?? '',
        tagline_en: collection?.tagline_en ?? '',
        description_ar: collection?.description_ar ?? '',
        description_en: collection?.description_en ?? '',
        image_path: collection?.image_path ?? null,
        image_url: collection?.image_url ?? null,
        accent_color: collection?.accent_color ?? '',
        is_visible: collection?.is_visible ?? true,
        is_featured: collection?.is_featured ?? false,
        sort_order: String(collection?.sort_order ?? 0),
        product_ids: collection?.products?.map((product) => product.id) ?? [],
    };
}

function toPayload(form: CollectionForm): CollectionPayload {
    const text = (value: string) => (value.trim() === '' ? null : value.trim());

    return {
        name: form.name.trim(),
        slug: form.slug.trim(),
        tagline: text(form.tagline),
        description: text(form.description),
        name_ar: text(form.name_ar),
        name_en: text(form.name_en),
        tagline_ar: text(form.tagline_ar),
        tagline_en: text(form.tagline_en),
        description_ar: text(form.description_ar),
        description_en: text(form.description_en),
        image_path: form.image_path,
        accent_color: form.accent_color === '' ? null : form.accent_color.toLowerCase(),
        is_visible: form.is_visible,
        is_featured: form.is_featured,
        sort_order: Number.parseInt(form.sort_order, 10) || 0,
        product_ids: form.product_ids,
    };
}

function CollectionEditor({ initial, options }: { initial: AdminCollection | null; options: CatalogOptions }) {
    const navigate = useNavigate();
    const [collection, setCollection] = useState(initial);
    const [form, setForm] = useState<CollectionForm>(() => toForm(initial));
    const [baseline, setBaseline] = useState(() => JSON.stringify(form));
    const [errors, setErrors] = useState<FieldErrors>({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const dirty = JSON.stringify(form) !== baseline;
    const { blocker, allowNavigation } = useUnsavedChanges(dirty);
    useDocumentTitle(collection ? collection.name : 'Nouvelle collection');

    const set = <K extends keyof CollectionForm>(key: K, value: CollectionForm[K]) => setForm((current) => ({ ...current, [key]: value }));

    async function submit(event: FormEvent) {
        event.preventDefault();
        const local: FieldErrors = {};
        if (form.name.trim() === '') {
            local.name = 'Indiquez le nom de la collection.';
        }
        if (form.accent_color !== '' && !/^#[0-9a-fA-F]{6}$/.test(form.accent_color)) {
            local.accent_color = 'Couleur au format #RRGGBB.';
        }
        if (hasErrors(local)) {
            setErrors(local);
            focusFirstInvalid();

            return;
        }

        setSaving(true);
        try {
            const payload = toPayload(form);
            const saved = collection ? await api.collections.update(collection.id, payload) : await api.collections.create(payload);
            invalidateCatalogOptions();
            const next: CollectionForm = { ...form, slug: saved.slug, image_url: saved.image_url, image_path: saved.image_path };
            setForm(next);
            setBaseline(JSON.stringify(next));
            setCollection({ ...saved, products: collection?.products });
            setErrors({});
            toast.success(collection ? 'Collection enregistrée.' : 'Collection créée.');
            if (!collection) {
                allowNavigation();
                navigate(`/collections/${saved.id}`, { replace: true });
            }
        } catch (error) {
            const fields = toFieldErrors(error);
            setErrors(fields);
            toast.error(hasErrors(fields) ? 'Vérifiez les champs signalés.' : errorText(error));
            focusFirstInvalid();
        } finally {
            setSaving(false);
        }
    }

    return (
        <form id="collection-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
            <PageHeader
                back={{ to: '/collections', label: 'Collections' }}
                title={collection ? collection.name : 'Nouvelle collection'}
                meta={collection && (collection.is_visible ? <Badge tone="success" dot>Visible</Badge> : <Badge tone="muted" dot>Masquée</Badge>)}
                actions={
                    collection?.is_visible && (
                        <a
                            href={`/collections/${collection.slug}`}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
                        >
                            <ExternalLink className="size-4" aria-hidden />
                            Voir sur la boutique
                            <span className="sr-only">(nouvel onglet)</span>
                        </a>
                    )
                }
            />

            <div className="grid items-start gap-6 xl:grid-cols-3">
                <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
                    <Panel title="Présentation">
                        <div className="flex flex-col gap-4">
                            <Field label="Nom" required error={errors.name}>
                                {(control) => <TextInput {...control} value={form.name} maxLength={120} onChange={(event) => set('name', event.target.value)} />}
                            </Field>
                            <Field label="Identifiant d’URL" error={errors.slug} hint="Laissez vide pour le générer à partir du nom.">
                                {(control) => (
                                    <AffixInput
                                        {...control}
                                        value={form.slug}
                                        prefix={<span className="text-xs">/collections/</span>}
                                        className="pl-[6.25rem] font-mono text-xs"
                                        placeholder={slugify(form.name) || 'nom-de-la-collection'}
                                        spellCheck={false}
                                        onChange={(event) => set('slug', event.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                    />
                                )}
                            </Field>
                            <Field label="Accroche" optional error={errors.tagline} counter={{ value: form.tagline.length, max: 255 }}>
                                {(control) => <TextInput {...control} value={form.tagline} maxLength={255} onChange={(event) => set('tagline', event.target.value)} />}
                            </Field>
                            <Field label="Description" optional error={errors.description} counter={{ value: form.description.length, max: 3000 }}>
                                {(control) => <TextArea {...control} rows={5} maxLength={3000} value={form.description} onChange={(event) => set('description', event.target.value)} />}
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Version arabe" description={ARABIC_PANEL_HINT}>
                        <div className="flex flex-col gap-4">
                            <Field label="Nom" optional error={errors.name_ar}>
                                {(control) => <TextInput {...control} {...arabicText} value={form.name_ar} maxLength={120} placeholder={form.name} onChange={(event) => set('name_ar', event.target.value)} />}
                            </Field>
                            <Field label="Accroche" optional error={errors.tagline_ar} counter={{ value: form.tagline_ar.length, max: 255 }}>
                                {(control) => <TextInput {...control} {...arabicText} value={form.tagline_ar} maxLength={255} placeholder={form.tagline} onChange={(event) => set('tagline_ar', event.target.value)} />}
                            </Field>
                            <Field label="Description" optional error={errors.description_ar} counter={{ value: form.description_ar.length, max: 3000 }}>
                                {(control) => <TextArea {...control} {...arabicText} rows={5} maxLength={3000} value={form.description_ar} onChange={(event) => set('description_ar', event.target.value)} />}
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Version anglaise" description={ENGLISH_PANEL_HINT}>
                        <div className="flex flex-col gap-4">
                            <Field label="Nom" optional error={errors.name_en}>
                                {(control) => <TextInput {...control} {...englishText} value={form.name_en} maxLength={120} placeholder={form.name} onChange={(event) => set('name_en', event.target.value)} />}
                            </Field>
                            <Field label="Accroche" optional error={errors.tagline_en} counter={{ value: form.tagline_en.length, max: 255 }}>
                                {(control) => <TextInput {...control} {...englishText} value={form.tagline_en} maxLength={255} placeholder={form.tagline} onChange={(event) => set('tagline_en', event.target.value)} />}
                            </Field>
                            <Field label="Description" optional error={errors.description_en} counter={{ value: form.description_en.length, max: 3000 }}>
                                {(control) => <TextArea {...control} {...englishText} rows={5} maxLength={3000} value={form.description_en} onChange={(event) => set('description_en', event.target.value)} />}
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Parfums de la collection" description="L’ordre de la liste est celui de la boutique.">
                        <ProductPicker label="Sélection" ordered products={options.products} value={form.product_ids} onChange={(ids) => set('product_ids', ids)} />
                        {firstError(errors, 'product_ids') && <p className="mt-2 text-xs text-danger">{firstError(errors, 'product_ids')}</p>}
                    </Panel>
                </div>

                <div className="flex min-w-0 flex-col gap-6">
                    <Panel title="Affichage">
                        <div className="flex flex-col gap-4">
                            <Switch checked={form.is_visible} onChange={(value) => set('is_visible', value)} label="Visible sur la boutique" description="Masquée, la collection n’est accessible à personne." />
                            <Switch checked={form.is_featured} onChange={(value) => set('is_featured', value)} label="À la une" description="Proposée sur la page d’accueil." />
                            <Field label="Ordre d’affichage" error={errors.sort_order}>
                                {(control) => <TextInput {...control} inputMode="numeric" className="w-28 tabular-nums" value={form.sort_order} onChange={(event) => set('sort_order', event.target.value)} />}
                            </Field>
                        </div>
                    </Panel>
                    <Panel title="Visuel">
                        <div className="flex flex-col gap-4">
                            <ImageField
                                folder="collections"
                                label="Image de la collection"
                                path={form.image_path}
                                url={form.image_url}
                                error={errors.image_path}
                                onChange={({ path, url }) => setForm((current) => ({ ...current, image_path: path, image_url: url }))}
                            />
                            <Field label="Couleur d’accent" optional error={errors.accent_color}>
                                {(control) => <ColorField control={control} value={form.accent_color} onChange={(value) => set('accent_color', value)} />}
                            </Field>
                        </div>
                    </Panel>
                    {collection && (
                        <Panel title="Suppression">
                            <p className="text-sm text-muted">Les parfums de la collection restent au catalogue.</p>
                            <Button variant="danger-outline" icon={Trash2} className="mt-4" onClick={() => setDeleting(true)}>
                                Supprimer la collection
                            </Button>
                        </Panel>
                    )}
                </div>
            </div>

            <FormBar form="collection-form" dirty={dirty} saving={saving} submitLabel={collection ? 'Enregistrer' : 'Créer la collection'} onReset={collection ? () => setForm(JSON.parse(baseline) as CollectionForm) : undefined} />
            <UnsavedChangesDialog blocker={blocker} />
            {collection && (
                <ConfirmDialog
                    open={deleting}
                    onClose={() => setDeleting(false)}
                    title={`Supprimer « ${collection.name} » ?`}
                    description="La collection disparaît de la boutique ; cette action est définitive."
                    confirmLabel="Supprimer"
                    onConfirm={async () => {
                        await api.collections.remove(collection.id);
                        invalidateCatalogOptions();
                        toast.success('Collection supprimée.');
                        allowNavigation();
                        navigate('/collections');
                    }}
                />
            )}
        </form>
    );
}

export default function CollectionFormPage() {
    const { id } = useParams();
    const collectionId = id ? Number(id) : null;
    const validId = collectionId === null || (Number.isInteger(collectionId) && collectionId > 0);
    const catalog = useCatalogOptions();
    const query = useApiQuery(collectionId && validId ? `collection:${collectionId}` : null, (signal) => api.collections.show(collectionId!, signal));
    const header = <PageHeader back={{ to: '/collections', label: 'Collections' }} title={collectionId ? 'Collection' : 'Nouvelle collection'} />;
    const error = !validId ? new ApiError(404, 'Collection introuvable.') : (query.error ?? catalog.error);

    if (error) {
        return (
            <div className="flex flex-col gap-6">
                {header}
                <Panel>
                    <ErrorState
                        error={error}
                        onRetry={() => {
                            query.reload();
                            catalog.reload();
                        }}
                    />
                </Panel>
            </div>
        );
    }

    if (!catalog.options || (collectionId !== null && !query.data)) {
        return (
            <div className="flex flex-col gap-6" aria-busy="true">
                {header}
                <div className="grid gap-6 xl:grid-cols-3">
                    <Skeleton className="h-96 w-full rounded-xl xl:col-span-2" />
                    <Skeleton className="h-72 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return <CollectionEditor key={query.data?.id ?? 'new'} initial={query.data ?? null} options={catalog.options} />;
}
