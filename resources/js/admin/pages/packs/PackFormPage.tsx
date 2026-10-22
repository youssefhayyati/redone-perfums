import { useId, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { plural } from '@shared/format';
import { ApiError } from '@shared/http';
import { formatMoney } from '@shared/money';
import * as api from '../../api';
import { Badge } from '../../components/ui/Badge';
import { Button, IconButton } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState, InlineAlert, Skeleton } from '../../components/ui/feedback';
import { ChipToggleGroup, UnsavedChangesDialog } from '../../components/ui/fields';
import { AffixInput, ARABIC_PANEL_HINT, arabicText, Field, FieldError, Fieldset, MoneyInput, RadioCards, SelectInput, Switch, TextArea, TextInput } from '../../components/ui/form';
import { FormBar } from '../../components/ui/FormBar';
import { PageHeader, Panel } from '../../components/ui/Panel';
import { ImageField, ProductPicker } from '../../components/ui/pickers';
import { toast } from '../../components/ui/toast';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useCatalogOptions } from '../../hooks/useCatalogOptions';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { errorText, firstError, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../../lib/errors';
import { slugify } from '../../lib/slug';
import { PACK_TYPE_LABELS } from '../../lib/status';
import type { AdminPack, CatalogOptions } from '../../types';
import { emptyPackForm, newItemRow, packFormToPayload, packToForm, type PackForm, type PackItemRow } from './packForm';
import { parseInteger } from '../products/productForm';

function FixedItems({ rows, onChange, errors, options }: { rows: PackItemRow[]; onChange: (rows: PackItemRow[]) => void; errors: FieldErrors; options: CatalogOptions }) {
    const baseId = useId();
    const update = (index: number, patch: Partial<PackItemRow>) => onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
    const variants = new Map(options.products.flatMap((product) => product.variants.map((variant) => [variant.id, { ...variant, product: product.name }] as const)));
    const bottles = rows.reduce((sum, row) => sum + (parseInteger(row.quantity) ?? 0), 0);
    const value = rows.reduce((sum, row) => sum + (variants.get(Number(row.variant_id))?.price ?? 0) * (parseInteger(row.quantity) ?? 0), 0);

    return (
        <div className="flex flex-col gap-3">
            {errors.items && (
                <InlineAlert tone="danger" live>
                    {errors.items}
                </InlineAlert>
            )}
            <ul className="flex flex-col gap-3">
                {rows.map((row, index) => {
                    const product = options.products.find((candidate) => String(candidate.id) === row.product_id);
                    const id = (field: string) => `${baseId}-${index}-${field}`;
                    const variantError = errors[`items.${index}.variant_id`];
                    const quantityError = errors[`items.${index}.quantity`];

                    return (
                        <li key={row.key} className="grid grid-cols-[1fr_auto] items-start gap-3 rounded-lg border border-line p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_auto]">
                            <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                                <label htmlFor={id('product')} className="text-2xs font-medium text-muted">
                                    Parfum
                                </label>
                                <SelectInput id={id('product')} value={row.product_id} onChange={(event) => update(index, { product_id: event.target.value, variant_id: '' })}>
                                    <option value="">Choisir un parfum…</option>
                                    {options.products.map((candidate) => (
                                        <option key={candidate.id} value={candidate.id}>
                                            {candidate.name}
                                        </option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor={id('variant')} className="text-2xs font-medium text-muted">
                                    Format
                                </label>
                                <SelectInput
                                    id={id('variant')}
                                    value={row.variant_id}
                                    disabled={!product}
                                    aria-invalid={variantError ? true : undefined}
                                    aria-describedby={variantError ? `${id('variant')}-error` : undefined}
                                    onChange={(event) => update(index, { variant_id: event.target.value })}
                                >
                                    <option value="">{product ? 'Choisir…' : '—'}</option>
                                    {product?.variants.map((variant) => (
                                        <option key={variant.id} value={variant.id}>
                                            {variant.label} · {formatMoney(variant.price)}
                                            {variant.stock <= 0 ? ' · rupture' : ''}
                                            {!variant.is_active ? ' · inactif' : ''}
                                        </option>
                                    ))}
                                </SelectInput>
                                {variantError && <FieldError id={`${id('variant')}-error`}>{variantError}</FieldError>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor={id('quantity')} className="text-2xs font-medium text-muted">
                                    Quantité
                                </label>
                                <TextInput
                                    id={id('quantity')}
                                    inputMode="numeric"
                                    value={row.quantity}
                                    aria-invalid={quantityError ? true : undefined}
                                    aria-describedby={quantityError ? `${id('quantity')}-error` : undefined}
                                    onChange={(event) => update(index, { quantity: event.target.value })}
                                    className="tabular-nums"
                                />
                                {quantityError && <FieldError id={`${id('quantity')}-error`}>{quantityError}</FieldError>}
                            </div>
                            <div className="flex h-full items-end pb-0.5">
                                <IconButton icon={Trash2} variant="danger" label={`Retirer la ligne ${index + 1}`} disabled={rows.length <= 1} onClick={() => onChange(rows.filter((_, position) => position !== index))} />
                            </div>
                        </li>
                    );
                })}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button size="sm" icon={Plus} onClick={() => onChange([...rows, newItemRow()])} disabled={rows.length >= 12}>
                    Ajouter un parfum
                </Button>
                <p className="text-xs text-muted tabular-nums">
                    {plural(bottles, 'flacon')}
                    {value > 0 && ` · valeur à l’unité ${formatMoney(value)}`}
                </p>
            </div>
        </div>
    );
}

function PackEditor({ initial, options }: { initial: AdminPack | null; options: CatalogOptions }) {
    const navigate = useNavigate();
    const [pack, setPack] = useState(initial);
    const [form, setForm] = useState<PackForm>(() => (initial ? packToForm(initial, options.products) : emptyPackForm()));
    const [baseline, setBaseline] = useState(() => JSON.stringify(form));
    const [errors, setErrors] = useState<FieldErrors>({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const dirty = JSON.stringify(form) !== baseline;
    const { blocker, allowNavigation } = useUnsavedChanges(dirty);
    useDocumentTitle(pack ? pack.name : 'Nouveau coffret');

    const set = <K extends keyof PackForm>(key: K, value: PackForm[K]) => setForm((current) => ({ ...current, [key]: value }));

    async function submit(event: FormEvent) {
        event.preventDefault();
        const { payload, errors: local } = packFormToPayload(form);
        if (hasErrors(local)) {
            setErrors(local);
            toast.error('Vérifiez les champs signalés.');
            focusFirstInvalid();

            return;
        }
        setSaving(true);
        try {
            const saved = pack ? await api.packs.update(pack.id, payload) : await api.packs.create(payload);
            // Reload to get the eligible count and the composition labels.
            const fresh = await api.packs.show(saved.id).catch(() => saved);
            const next = packToForm(fresh, options.products);
            setForm(next);
            setBaseline(JSON.stringify(next));
            setPack(fresh);
            setErrors({});
            toast.success(pack ? 'Coffret enregistré.' : 'Coffret créé.');
            if (!pack) {
                allowNavigation();
                navigate(`/coffrets/${saved.id}`, { replace: true });
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

    const custom = form.type === 'custom';

    return (
        <form id="pack-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
            <PageHeader
                back={{ to: '/coffrets', label: 'Coffrets' }}
                title={pack ? pack.name : 'Nouveau coffret'}
                meta={
                    pack && (
                        <>
                            {pack.is_active ? <Badge tone="success" dot>Actif</Badge> : <Badge tone="muted" dot>Inactif</Badge>}
                            <Badge>{PACK_TYPE_LABELS[pack.type]}</Badge>
                            {pack.is_demo && <Badge tone="muted">Démo</Badge>}
                        </>
                    )
                }
                actions={
                    pack?.is_active && (
                        <a
                            href={`/coffrets/${pack.slug}`}
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
                                        prefix={<span className="text-xs">/coffrets/</span>}
                                        className="pl-[5.25rem] font-mono text-xs"
                                        placeholder={slugify(form.name) || 'nom-du-coffret'}
                                        spellCheck={false}
                                        onChange={(event) => set('slug', event.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                    />
                                )}
                            </Field>
                            <Field label="Accroche" optional error={errors.tagline} counter={{ value: form.tagline.length, max: 255 }}>
                                {(control) => <TextInput {...control} value={form.tagline} maxLength={255} onChange={(event) => set('tagline', event.target.value)} />}
                            </Field>
                            <Field label="Description" optional error={errors.description} counter={{ value: form.description.length, max: 3000 }}>
                                {(control) => <TextArea {...control} rows={4} maxLength={3000} value={form.description} onChange={(event) => set('description', event.target.value)} />}
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
                                {(control) => <TextArea {...control} {...arabicText} rows={4} maxLength={3000} value={form.description_ar} onChange={(event) => set('description_ar', event.target.value)} />}
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Composition">
                        <div className="flex flex-col gap-5">
                            <Fieldset legend="Type de coffret" error={errors.type}>
                                <RadioCards
                                    value={form.type}
                                    onChange={(value) => set('type', value)}
                                    options={[
                                        { value: 'custom', label: 'À composer', description: 'Le client choisit ses flacons parmi les parfums éligibles.' },
                                        { value: 'fixed', label: 'Composition fixe', description: 'Vous définissez les flacons du coffret.' },
                                    ]}
                                />
                            </Fieldset>

                            {custom ? (
                                <>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field label="Nombre de flacons à choisir" required error={errors.selection_count} hint="De 2 à 12.">
                                            {(control) => (
                                                <TextInput {...control} inputMode="numeric" className="w-28 tabular-nums" value={form.selection_count} onChange={(event) => set('selection_count', event.target.value)} />
                                            )}
                                        </Field>
                                        <div className="pt-1 sm:pt-6">
                                            <Switch
                                                checked={form.allow_duplicates}
                                                onChange={(value) => set('allow_duplicates', value)}
                                                label="Autoriser les doublons"
                                                description="Le même parfum peut être choisi plusieurs fois."
                                            />
                                        </div>
                                    </div>
                                    <Fieldset legend="Contenances autorisées" hint="Aucune sélection : toutes les contenances." error={firstError(errors, 'allowed_sizes')}>
                                        <ChipToggleGroup
                                            label="Contenances autorisées"
                                            options={options.sizes.map((size) => ({ value: size, label: `${size} ml` }))}
                                            value={form.allowed_sizes}
                                            onChange={(value) => set('allowed_sizes', value)}
                                        />
                                    </Fieldset>
                                    <Fieldset legend="Parfums éligibles" error={errors.eligibility}>
                                        <RadioCards
                                            columns={3}
                                            value={form.eligibility}
                                            onChange={(value) => set('eligibility', value)}
                                            options={[
                                                { value: 'all', label: 'Tout le catalogue' },
                                                { value: 'collections', label: 'Certaines collections' },
                                                { value: 'products', label: 'Parfums choisis' },
                                            ]}
                                        />
                                    </Fieldset>
                                    {form.eligibility === 'collections' && (
                                        <Fieldset legend="Collections éligibles" error={firstError(errors, 'collection_ids')}>
                                            <ChipToggleGroup
                                                label="Collections éligibles"
                                                options={options.collections.map((collection) => ({ value: collection.id, label: collection.name }))}
                                                value={form.collection_ids}
                                                onChange={(value) => set('collection_ids', value)}
                                                emptyText="Aucune collection créée."
                                            />
                                        </Fieldset>
                                    )}
                                    {form.eligibility === 'products' && (
                                        <div className="flex flex-col gap-2">
                                            <ProductPicker label="Parfums éligibles" products={options.products} value={form.product_ids} onChange={(ids) => set('product_ids', ids)} />
                                            {firstError(errors, 'product_ids') && <FieldError>{firstError(errors, 'product_ids')}</FieldError>}
                                        </div>
                                    )}
                                    {pack?.type === 'custom' && pack.eligible_count !== undefined && pack.eligible_count !== null && (
                                        <p className="text-sm text-muted">
                                            Actuellement <span className="font-medium text-ink">{plural(pack.eligible_count, 'format éligible', 'formats éligibles')}</span> d’après la dernière version enregistrée.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <FixedItems rows={form.items} onChange={(rows) => set('items', rows)} errors={errors} options={options} />
                            )}
                        </div>
                    </Panel>

                    <Panel title="Tarification">
                        <div className="flex flex-col gap-4">
                            <RadioCards
                                columns={3}
                                value={form.pricing_type}
                                onChange={(value) => set('pricing_type', value)}
                                options={[
                                    { value: 'fixed', label: 'Prix fixe', description: 'Le coffret coûte toujours le même prix.' },
                                    { value: 'percent', label: 'Remise en %', description: 'Sur la somme des flacons choisis.' },
                                    { value: 'amount', label: 'Remise en DH', description: 'Montant déduit de la somme des flacons.' },
                                ]}
                            />
                            {form.pricing_type === 'fixed' && (
                                <Field label="Prix du coffret" required error={errors.price}>
                                    {(control) => <MoneyInput {...control} wrapperClassName="w-40" value={form.price} onChange={(event) => set('price', event.target.value)} />}
                                </Field>
                            )}
                            {form.pricing_type === 'percent' && (
                                <Field label="Remise" required error={errors.discount_value} hint="Pourcentage entier, de 1 à 90.">
                                    {(control) => (
                                        <AffixInput {...control} inputMode="numeric" suffix="%" wrapperClassName="w-32" value={form.discount_percent} onChange={(event) => set('discount_percent', event.target.value)} />
                                    )}
                                </Field>
                            )}
                            {form.pricing_type === 'amount' && (
                                <Field label="Remise" required error={errors.discount_value}>
                                    {(control) => <MoneyInput {...control} wrapperClassName="w-40" value={form.discount_amount} onChange={(event) => set('discount_amount', event.target.value)} />}
                                </Field>
                            )}
                            {pack && (
                                <div className="rounded-lg border border-line bg-sunken/60 px-4 py-3 text-sm">
                                    <p className="text-2xs font-medium uppercase tracking-label text-muted">Affiché sur la boutique</p>
                                    <p className="mt-1.5 text-ink">
                                        {pack.pricing_label}
                                        {' · '}
                                        {pack.starting_price !== null ? `à partir de ${formatMoney(pack.starting_price)}` : 'prix de départ indisponible (stock ou parfums éligibles insuffisants)'}
                                    </p>
                                    {dirty && <p className="mt-1 text-xs text-muted">Enregistrez pour mettre à jour cet aperçu.</p>}
                                </div>
                            )}
                        </div>
                    </Panel>
                </div>

                <div className="flex min-w-0 flex-col gap-6">
                    <Panel title="Affichage">
                        <div className="flex flex-col gap-4">
                            <Switch checked={form.is_active} onChange={(value) => set('is_active', value)} label="Coffret actif" description="Inactif, il n’est plus proposé sur la boutique." />
                            <Field label="Ordre d’affichage" error={errors.sort_order}>
                                {(control) => <TextInput {...control} inputMode="numeric" className="w-28 tabular-nums" value={form.sort_order} onChange={(event) => set('sort_order', event.target.value)} />}
                            </Field>
                        </div>
                    </Panel>
                    <Panel title="Visuel">
                        <ImageField
                            folder="packs"
                            label="Image du coffret"
                            path={form.image_path}
                            url={form.image_url}
                            error={errors.image_path}
                            onChange={({ path, url }) => setForm((current) => ({ ...current, image_path: path, image_url: url }))}
                        />
                    </Panel>
                    {pack && (
                        <Panel title="Suppression">
                            <p className="text-sm text-muted">Les commandes passées gardent le détail du coffret ; les paniers en cours le perdent.</p>
                            <Button variant="danger-outline" icon={Trash2} className="mt-4" onClick={() => setDeleting(true)}>
                                Supprimer le coffret
                            </Button>
                        </Panel>
                    )}
                </div>
            </div>

            <FormBar form="pack-form" dirty={dirty} saving={saving} submitLabel={pack ? 'Enregistrer' : 'Créer le coffret'} onReset={pack ? () => setForm(JSON.parse(baseline) as PackForm) : undefined} />
            <UnsavedChangesDialog blocker={blocker} />
            {pack && (
                <ConfirmDialog
                    open={deleting}
                    onClose={() => setDeleting(false)}
                    title={`Supprimer « ${pack.name} » ?`}
                    description="Le coffret disparaît de la boutique ; cette action est définitive."
                    confirmLabel="Supprimer"
                    onConfirm={async () => {
                        await api.packs.remove(pack.id);
                        toast.success('Coffret supprimé.');
                        allowNavigation();
                        navigate('/coffrets');
                    }}
                />
            )}
        </form>
    );
}

export default function PackFormPage() {
    const { id } = useParams();
    const packId = id ? Number(id) : null;
    const validId = packId === null || (Number.isInteger(packId) && packId > 0);
    const catalog = useCatalogOptions();
    const query = useApiQuery(packId && validId ? `pack:${packId}` : null, (signal) => api.packs.show(packId!, signal));
    const header = <PageHeader back={{ to: '/coffrets', label: 'Coffrets' }} title={packId ? 'Coffret' : 'Nouveau coffret'} />;
    const error = !validId ? new ApiError(404, 'Coffret introuvable.') : (query.error ?? catalog.error);

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

    if (!catalog.options || (packId !== null && !query.data)) {
        return (
            <div className="flex flex-col gap-6" aria-busy="true">
                {header}
                <div className="grid gap-6 xl:grid-cols-3">
                    <Skeleton className="h-[28rem] w-full rounded-xl xl:col-span-2" />
                    <Skeleton className="h-72 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return <PackEditor key={query.data?.id ?? 'new'} initial={query.data ?? null} options={catalog.options} />;
}
