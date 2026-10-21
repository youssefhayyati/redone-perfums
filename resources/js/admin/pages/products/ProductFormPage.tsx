import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Archive, ExternalLink } from 'lucide-react';
import { formatDateTime } from '@shared/format';
import { ApiError } from '@shared/http';
import * as api from '../../api';
import { Badge, ProductStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState, Skeleton } from '../../components/ui/feedback';
import { ChipToggleGroup, ColorField, UnsavedChangesDialog } from '../../components/ui/fields';
import { Field, Fieldset, ScaleInput, SelectInput, Switch, TextArea, TextInput, AffixInput } from '../../components/ui/form';
import { FormBar } from '../../components/ui/FormBar';
import { PageHeader, Panel } from '../../components/ui/Panel';
import { TagInput } from '../../components/ui/TagInput';
import { toast } from '../../components/ui/toast';
import { useApiQuery } from '../../hooks/useApiQuery';
import { invalidateCatalogOptions, useCatalogOptions } from '../../hooks/useCatalogOptions';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { errorText, firstError, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../../lib/errors';
import { slugify } from '../../lib/slug';
import { BADGE_LABELS, GENDER_LABELS, PRODUCT_STATUSES, PRODUCT_STATUS_LABELS } from '../../lib/status';
import type { AdminProduct, CatalogOptions, ImageAsset, NoteLayer } from '../../types';
import { ImagesManager } from './ImagesManager';
import { emptyProductForm, productFormToPayload, productToForm, type ProductForm } from './productForm';
import { VariantsEditor } from './VariantsEditor';

const STATUS_HINTS = {
    draft: 'Invisible sur la boutique, en cours de préparation.',
    active: 'Visible et en vente sur la boutique (à la date de publication si elle est renseignée).',
    archived: 'Retiré de la vente : invisible sur la boutique mais conservé dans le catalogue.',
} as const;

const NOTE_LAYERS: Array<{ layer: NoteLayer; label: string; hint: string }> = [
    { layer: 'top', label: 'Notes de tête', hint: 'Les premières minutes.' },
    { layer: 'heart', label: 'Notes de cœur', hint: 'Le caractère du parfum.' },
    { layer: 'base', label: 'Notes de fond', hint: 'Le sillage, des heures durant.' },
];

const CONCENTRATIONS = ['Eau de parfum', 'Extrait de parfum', 'Eau de toilette', 'Huile parfumée'];

function ProductEditor({ initial, options }: { initial: AdminProduct | null; options: CatalogOptions }) {
    const navigate = useNavigate();
    const [product, setProduct] = useState(initial);
    const [images, setImages] = useState<ImageAsset[]>(initial?.images ?? []);
    const [form, setForm] = useState<ProductForm>(() => (initial ? productToForm(initial) : emptyProductForm()));
    const [baseline, setBaseline] = useState(() => JSON.stringify(form));
    const [errors, setErrors] = useState<FieldErrors>({});
    const [saving, setSaving] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const dirty = JSON.stringify(form) !== baseline;
    const { blocker, allowNavigation } = useUnsavedChanges(dirty);
    useDocumentTitle(product ? product.name : 'Nouveau produit');

    const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((current) => ({ ...current, [key]: value }));
    const text = (key: 'name' | 'slug' | 'tagline' | 'description' | 'inspiration' | 'meta_title' | 'meta_description' | 'concentration' | 'sort_order' | 'published_at') => ({
        value: form[key],
        onChange: (event: { target: { value: string } }) => set(key, event.target.value),
    });

    async function submit(event: FormEvent) {
        event.preventDefault();
        const { payload, errors: local } = productFormToPayload(form);
        if (hasErrors(local)) {
            setErrors(local);
            toast.error('Vérifiez les champs signalés.');
            focusFirstInvalid();

            return;
        }

        setSaving(true);
        try {
            const saved = product ? await api.products.update(product.id, payload) : await api.products.create(payload);
            invalidateCatalogOptions();
            const next = productToForm(saved);
            setForm(next);
            setBaseline(JSON.stringify(next));
            setProduct(saved);
            setImages(saved.images ?? images);
            setErrors({});
            if (product) {
                toast.success('Produit enregistré.');
            } else {
                toast.success('Produit créé. Vous pouvez maintenant ajouter ses photos.');
                allowNavigation();
                navigate(`/produits/${saved.id}`, { replace: true });
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

    const slugPreview = form.slug.trim() || slugify(form.name);

    return (
        <form id="product-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
            <PageHeader
                back={{ to: '/produits', label: 'Produits' }}
                title={product ? product.name : 'Nouveau produit'}
                meta={
                    product && (
                        <>
                            <ProductStatusBadge status={product.status} />
                            {product.is_featured && <Badge tone="accent">Mis en avant</Badge>}
                            {product.is_demo && <Badge tone="muted">Démo</Badge>}
                            {product.updated_at && <span className="text-xs text-muted">Modifié le {formatDateTime(product.updated_at)}</span>}
                        </>
                    )
                }
                actions={
                    product &&
                    product.status === 'active' && (
                        <a
                            href={`/parfums/${product.slug}`}
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
                    <Panel title="Informations">
                        <div className="flex flex-col gap-4">
                            <Field label="Nom" required error={errors.name}>
                                {(control) => <TextInput {...control} {...text('name')} maxLength={120} autoComplete="off" />}
                            </Field>
                            <Field
                                label="Identifiant d’URL"
                                error={errors.slug}
                                hint={form.slug.trim() === '' ? 'Laissez vide pour le générer à partir du nom.' : 'Modifier l’identifiant change l’adresse de la page produit.'}
                            >
                                {(control) => (
                                    <AffixInput
                                        {...control}
                                        {...text('slug')}
                                        prefix={<span className="text-xs">/parfums/</span>}
                                        className="pl-[4.75rem] font-mono text-xs"
                                        placeholder={slugPreview || 'nom-du-parfum'}
                                        spellCheck={false}
                                        onChange={(event) => set('slug', event.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                    />
                                )}
                            </Field>
                            <Field label="Accroche" optional error={errors.tagline} counter={{ value: form.tagline.length, max: 255 }}>
                                {(control) => <TextInput {...control} {...text('tagline')} maxLength={255} placeholder="Une phrase qui résume le parfum" />}
                            </Field>
                            <Field label="Description" optional error={errors.description} counter={{ value: form.description.length, max: 5000 }}>
                                {(control) => <TextArea {...control} {...text('description')} rows={6} maxLength={5000} />}
                            </Field>
                            <Field label="Inspiration" optional error={errors.inspiration} hint="Le récit derrière la composition, repris sur la page d’accueil." counter={{ value: form.inspiration.length, max: 5000 }}>
                                {(control) => <TextArea {...control} {...text('inspiration')} rows={4} maxLength={5000} />}
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Pyramide olfactive" description="Saisissez une note puis Entrée ; les notes existantes sont proposées. 12 par étage au maximum.">
                        <div className="grid gap-4 lg:grid-cols-3">
                            {NOTE_LAYERS.map(({ layer, label, hint }) => (
                                <Field key={layer} label={label} hint={hint} error={firstError(errors, `notes.${layer}`)}>
                                    {(control) => (
                                        <TagInput
                                            control={control}
                                            values={form.notes[layer]}
                                            onChange={(values) => set('notes', { ...form.notes, [layer]: values })}
                                            suggest={(query, signal) => api.notes.search(query, signal)}
                                            placeholder="Ex. bergamote"
                                        />
                                    )}
                                </Field>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Formats et prix">
                        <VariantsEditor rows={form.variants} onChange={(rows) => set('variants', rows)} errors={errors} productName={form.name} sizes={options.sizes} />
                    </Panel>

                    <Panel title="Photos" description={product ? 'La première photo illustre le produit dans la boutique.' : undefined}>
                        {product ? (
                            <ImagesManager productId={product.id} productName={product.name} images={images} onChange={setImages} />
                        ) : (
                            <p className="text-sm text-muted">Enregistrez le produit pour ajouter ses photos.</p>
                        )}
                    </Panel>

                    <Panel title="Référencement" description="Laissés vides, le nom et l’accroche du produit sont utilisés.">
                        <div className="flex flex-col gap-4">
                            <Field label="Titre SEO" optional error={errors.meta_title} counter={{ value: form.meta_title.length, max: 255 }}>
                                {(control) => <TextInput {...control} {...text('meta_title')} maxLength={255} placeholder={form.name} />}
                            </Field>
                            <Field label="Description SEO" optional error={errors.meta_description} counter={{ value: form.meta_description.length, max: 320 }} hint="Idéalement 150 à 160 caractères.">
                                {(control) => <TextArea {...control} {...text('meta_description')} rows={3} maxLength={320} placeholder={form.tagline} />}
                            </Field>
                        </div>
                    </Panel>
                </div>

                <div className="flex min-w-0 flex-col gap-6">
                    <Panel title="Publication">
                        <div className="flex flex-col gap-4">
                            <Field label="Statut" error={errors.status} hint={STATUS_HINTS[form.status]}>
                                {(control) => (
                                    <SelectInput {...control} value={form.status} onChange={(event) => set('status', event.target.value as ProductForm['status'])}>
                                        {PRODUCT_STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {PRODUCT_STATUS_LABELS[status]}
                                            </option>
                                        ))}
                                    </SelectInput>
                                )}
                            </Field>
                            <Field label="Date de publication" optional error={errors.published_at} hint="Heure du Maroc. Une date future programme la mise en ligne.">
                                {(control) => <TextInput {...control} type="datetime-local" {...text('published_at')} />}
                            </Field>
                            <Switch checked={form.is_featured} onChange={(value) => set('is_featured', value)} label="Mettre en avant" description="Affiché dans la sélection de la page d’accueil." />
                            <Field label="Badge" optional error={errors.badge}>
                                {(control) => (
                                    <SelectInput {...control} value={form.badge} onChange={(event) => set('badge', event.target.value as ProductForm['badge'])}>
                                        <option value="">Aucun</option>
                                        {options.badges.map((badge) => (
                                            <option key={badge} value={badge}>
                                                {BADGE_LABELS[badge] ?? badge}
                                            </option>
                                        ))}
                                    </SelectInput>
                                )}
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Organisation">
                        <div className="flex flex-col gap-4">
                            <Field label="Famille olfactive" optional error={errors.fragrance_family_id}>
                                {(control) => (
                                    <SelectInput {...control} value={form.fragrance_family_id} onChange={(event) => set('fragrance_family_id', event.target.value)}>
                                        <option value="">Aucune</option>
                                        {options.families.map((family) => (
                                            <option key={family.id} value={family.id}>
                                                {family.name}
                                            </option>
                                        ))}
                                    </SelectInput>
                                )}
                            </Field>
                            <Fieldset legend="Collections" error={firstError(errors, 'collection_ids')}>
                                <ChipToggleGroup
                                    label="Collections"
                                    options={options.collections.map((collection) => ({ value: collection.id, label: collection.name }))}
                                    value={form.collection_ids}
                                    onChange={(value) => set('collection_ids', value)}
                                    emptyText="Aucune collection créée."
                                />
                            </Fieldset>
                            <Field label="Ordre d’affichage" error={errors.sort_order} hint="Les plus petits nombres apparaissent en premier.">
                                {(control) => <TextInput {...control} inputMode="numeric" {...text('sort_order')} className="w-28 tabular-nums" />}
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Caractéristiques">
                        <div className="flex flex-col gap-4">
                            <Field label="Genre" optional error={errors.gender}>
                                {(control) => (
                                    <SelectInput {...control} value={form.gender} onChange={(event) => set('gender', event.target.value as ProductForm['gender'])}>
                                        <option value="">Non précisé</option>
                                        {options.genders.map((gender) => (
                                            <option key={gender} value={gender}>
                                                {GENDER_LABELS[gender] ?? gender}
                                            </option>
                                        ))}
                                    </SelectInput>
                                )}
                            </Field>
                            <Field label="Concentration" optional error={errors.concentration}>
                                {(control) => (
                                    <>
                                        <TextInput {...control} {...text('concentration')} list="concentrations" maxLength={60} placeholder="Eau de parfum" />
                                        <datalist id="concentrations">
                                            {CONCENTRATIONS.map((value) => (
                                                <option key={value} value={value} />
                                            ))}
                                        </datalist>
                                    </>
                                )}
                            </Field>
                            <ScaleInput label="Tenue (1 à 5)" value={form.longevity} onChange={(value) => set('longevity', value)} error={errors.longevity} />
                            <ScaleInput label="Sillage (1 à 5)" value={form.sillage} onChange={(value) => set('sillage', value)} error={errors.sillage} />
                            <p className="-mt-2 text-xs text-muted">« — » : non communiqué, rien n’est affiché sur la fiche.</p>
                            <Field label="Couleur d’accent" optional error={errors.accent_color} hint="Teinte de la fiche produit sur la boutique.">
                                {(control) => <ColorField control={control} value={form.accent_color} onChange={(value) => set('accent_color', value)} />}
                            </Field>
                        </div>
                    </Panel>

                    {product && (
                        <Panel title="Archivage">
                            <p className="text-sm text-muted">Le produit disparaît de la boutique et des coffrets. Les commandes passées gardent leur historique ; il reste restaurable depuis les archives.</p>
                            <Button variant="danger-outline" icon={Archive} className="mt-4" onClick={() => setArchiving(true)}>
                                Archiver le produit
                            </Button>
                        </Panel>
                    )}
                </div>
            </div>

            <FormBar form="product-form" dirty={dirty} saving={saving} submitLabel={product ? 'Enregistrer' : 'Créer le produit'} onReset={product ? () => setForm(JSON.parse(baseline) as ProductForm) : undefined} />

            <UnsavedChangesDialog blocker={blocker} />
            {product && (
                <ConfirmDialog
                    open={archiving}
                    onClose={() => setArchiving(false)}
                    title={`Archiver « ${product.name} » ?`}
                    description="Il ne sera plus visible sur la boutique ni proposé dans les coffrets."
                    confirmLabel="Archiver"
                    onConfirm={async () => {
                        await api.products.archive(product.id);
                        invalidateCatalogOptions();
                        toast.success(`« ${product.name} » a été archivé.`);
                        allowNavigation();
                        navigate('/produits');
                    }}
                />
            )}
        </form>
    );
}

function FormSkeleton() {
    return (
        <div className="grid gap-6 xl:grid-cols-3" aria-busy="true">
            <span className="sr-only" role="status">
                Chargement du produit…
            </span>
            <div className="flex flex-col gap-6 xl:col-span-2">
                <div className="rounded-xl border border-line bg-raised p-5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="mt-6 h-10 w-full" />
                    <Skeleton className="mt-4 h-10 w-full" />
                    <Skeleton className="mt-4 h-32 w-full" />
                </div>
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div className="flex flex-col gap-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        </div>
    );
}

export default function ProductFormPage() {
    const { id } = useParams();
    const productId = id ? Number(id) : null;
    const validId = productId === null || (Number.isInteger(productId) && productId > 0);
    const catalog = useCatalogOptions();
    const query = useApiQuery(productId && validId ? `product:${productId}` : null, (signal) => api.products.show(productId!, signal));
    useDocumentTitle(productId ? 'Produit' : 'Nouveau produit');

    const header = <PageHeader back={{ to: '/produits', label: 'Produits' }} title={productId ? 'Produit' : 'Nouveau produit'} />;

    if (!validId) {
        return (
            <div className="flex flex-col gap-6">
                {header}
                <Panel>
                    <ErrorState error={new ApiError(404, 'Produit introuvable.')} />
                </Panel>
            </div>
        );
    }

    const error = query.error ?? catalog.error;
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

    if (!catalog.options || (productId !== null && !query.data)) {
        return (
            <div className="flex flex-col gap-6">
                {header}
                <FormSkeleton />
            </div>
        );
    }

    return <ProductEditor key={query.data?.id ?? 'new'} initial={query.data ?? null} options={catalog.options} />;
}
