import { useState, type FormEvent } from 'react';
import { ApiError } from '@shared/http';
import { coordinatesFromMapsLink, mapEmbedUrl, parseGeoPoint } from '@shared/maps';
import * as api from '../api';
import { ErrorState, Skeleton } from '../components/ui/feedback';
import { UnsavedChangesDialog } from '../components/ui/fields';
import { arabicText, englishText, Field, SelectInput, Switch, TextArea, TextInput } from '../components/ui/form';
import { FormBar } from '../components/ui/FormBar';
import { PageHeader, Panel } from '../components/ui/Panel';
import { toast } from '../components/ui/toast';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { errorText, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../lib/errors';
import type { SettingField, SettingsPayload } from '../types';
import { SETTING_GROUPS, settingsChanges, settingsErrors, settingsToDraft, validateSettings, type SettingsDraft } from './settings/settingsForm';

const HINTS: Record<string, string> = {
    'contact.whatsapp': 'Format international, ex. +212 6 12 34 56 78.',
    'home.story_product_id': 'Parfum publié dont le récit est présenté sur l’accueil.',
    'announcement.link': 'Ex. /coffrets — laissé vide, l’annonce n’est pas cliquable.',
    'store.meta_description': 'Environ 150 caractères.',
    'location.coordinates': 'Dans Google Maps, faites un clic droit sur la boutique puis cliquez sur les chiffres pour les copier. Coller le lien d’une page Google Maps fonctionne aussi.',
    'location.zoom': '16 montre le quartier, 18 la rue.',
    'analytics.ga4_id': 'Google Analytics → Admin → Flux de données → votre site : « ID de mesure ».',
    'analytics.meta_pixel_id': 'Gestionnaire d’événements Meta → Sources de données → votre pixel : son numéro d’identification.',
};

/** What the homepage map will show, following the coordinates as they are typed. */
function MapPreview({ coordinates, zoom }: { coordinates: string; zoom: string }) {
    const point = parseGeoPoint(coordinates);
    const level = Math.min(21, Math.max(3, Number.parseInt(zoom, 10) || 16));

    return (
        <div className="mt-5 overflow-hidden rounded-lg border border-line bg-sunken">
            {point ? (
                <iframe src={mapEmbedUrl(point, level, 'fr')} title="Aperçu de la carte de la boutique" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="block aspect-video w-full border-0" />
            ) : (
                <p className="flex aspect-video items-center justify-center p-6 text-center text-sm text-muted">Renseignez les coordonnées pour voir la carte. Tant qu’elles sont vides, la section reste masquée sur la boutique.</p>
            )}
        </div>
    );
}

/** Arabic and English copy is stored beside its French setting, under the same key with "_ar" or "_en". */
const isArabicSetting = (key: string): boolean => key.endsWith('_ar');
const isTranslatedSetting = (key: string): boolean => isArabicSetting(key) || key.endsWith('_en');

interface SettingInputProps {
    field: SettingField;
    value: string | boolean;
    /** For an Arabic or English setting: the French text shown when it is left blank. */
    french?: string;
    products: SettingsPayload['products'];
    error?: string;
    onChange: (value: string | boolean) => void;
}

function SettingInput({ field, value, french, products, error, onChange }: SettingInputProps) {
    if (field.type === 'boolean') {
        return <Switch checked={Boolean(value)} onChange={onChange} label={field.label} description={HINTS[field.key]} />;
    }

    const copy = isTranslatedSetting(field.key) ? { ...(isArabicSetting(field.key) ? arabicText : englishText), placeholder: french || undefined } : {};

    return (
        <Field label={field.label} error={error} hint={HINTS[field.key]} counter={field.type === 'text' ? { value: String(value).length, max: 2000 } : undefined}>
            {(control) =>
                field.key === 'home.story_product_id' ? (
                    <SelectInput {...control} value={String(value)} onChange={(event) => onChange(event.target.value)}>
                        <option value="">Aucun (section masquée)</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                        {value !== '' && !products.some((product) => String(product.id) === value) && <option value={String(value)}>Produit #{String(value)} (non publié)</option>}
                    </SelectInput>
                ) : field.type === 'text' ? (
                    <TextArea {...control} {...copy} rows={3} maxLength={2000} value={String(value)} onChange={(event) => onChange(event.target.value)} />
                ) : (
                    <TextInput
                        {...control}
                        type={field.type === 'url' ? 'url' : field.key === 'contact.email' ? 'email' : 'text'}
                        inputMode={field.type === 'integer' ? 'numeric' : undefined}
                        maxLength={255}
                        value={String(value)}
                        placeholder={field.type === 'url' ? 'https://' : undefined}
                        {...copy}
                        onChange={(event) => onChange(event.target.value)}
                    />
                )
            }
        </Field>
    );
}

function SettingsEditor({ initial }: { initial: SettingsPayload }) {
    const [payload, setPayload] = useState(initial);
    const [draft, setDraft] = useState<SettingsDraft>(() => settingsToDraft(initial.data));
    const [errors, setErrors] = useState<FieldErrors>({});
    const [saving, setSaving] = useState(false);
    const changes = settingsChanges(payload.data, draft);
    const dirty = Object.keys(changes).length > 0;
    const { blocker } = useUnsavedChanges(dirty);

    async function submit(event: FormEvent) {
        event.preventDefault();
        const local = validateSettings(payload.data, draft);
        if (hasErrors(local)) {
            setErrors(local);
            focusFirstInvalid();

            return;
        }
        if (!dirty) {
            toast.info('Aucune modification à enregistrer.');

            return;
        }
        setSaving(true);
        try {
            const saved = await api.settings.update(changes);
            setPayload(saved);
            setDraft(settingsToDraft(saved.data));
            setErrors({});
            toast.success('Réglages enregistrés.');
        } catch (error) {
            const fields = settingsErrors(toFieldErrors(error), payload.data);
            setErrors(fields);
            toast.error(error instanceof ApiError && error.isValidation ? 'Vérifiez les champs signalés.' : errorText(error));
            focusFirstInvalid();
        } finally {
            setSaving(false);
        }
    }

    const groups = SETTING_GROUPS.map((group) => ({ ...group, fields: payload.data.filter((field) => field.group === group.key) }));
    const known = new Set(SETTING_GROUPS.map((group) => group.key));
    const others = payload.data.filter((field) => !known.has(field.group));
    if (others.length > 0) {
        groups.push({ key: 'other', label: 'Autres réglages', description: undefined, fields: others });
    }

    return (
        <form id="settings-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
            <PageHeader
                title="Réglages"
                description="Informations et textes de la boutique, visibles immédiatement. Laissé vide, un champ « (arabe) » ou « (anglais) » reprend le texte français sur la boutique dans cette langue."
            />
            <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
                <nav aria-label="Sections des réglages" className="sticky top-20 hidden lg:block">
                    <ul className="flex flex-col gap-0.5 border-l border-line">
                        {groups
                            .filter((group) => group.fields.length > 0)
                            .map((group) => (
                                <li key={group.key}>
                                    <a href={`#reglages-${group.key}`} className="-ml-px block border-l border-transparent px-3 py-1.5 text-sm text-muted transition-colors hover:border-ink hover:text-ink">
                                        {group.label}
                                    </a>
                                </li>
                            ))}
                    </ul>
                </nav>
                <div className="flex min-w-0 flex-col gap-6">
                    {groups
                        .filter((group) => group.fields.length > 0)
                        .map((group) => (
                            <div key={group.key} id={`reglages-${group.key}`} className="scroll-mt-20">
                                <Panel title={group.label} description={group.description}>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {group.fields.map((field) => (
                                            <div key={field.key} className={field.type === 'text' || field.type === 'boolean' ? 'md:col-span-2' : undefined}>
                                                <SettingInput
                                                    field={field}
                                                    value={draft[field.key] ?? ''}
                                                    french={isTranslatedSetting(field.key) ? String(draft[field.key.slice(0, -3)] ?? '') : undefined}
                                                    products={payload.products}
                                                    error={errors[field.key]}
                                                    onChange={(value) =>
                                                        setDraft((current) => ({
                                                            ...current,
                                                            // A pasted Google Maps link becomes its "latitude, longitude".
                                                            [field.key]: field.key === 'location.coordinates' && typeof value === 'string' ? coordinatesFromMapsLink(value) : value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    {group.key === 'location' && <MapPreview coordinates={String(draft['location.coordinates'] ?? '')} zoom={String(draft['location.zoom'] ?? '')} />}
                                </Panel>
                            </div>
                        ))}
                </div>
            </div>
            <FormBar form="settings-form" dirty={dirty} saving={saving} onReset={() => setDraft(settingsToDraft(payload.data))} />
            <UnsavedChangesDialog blocker={blocker} />
        </form>
    );
}

export default function SettingsPage() {
    useDocumentTitle('Réglages');
    const query = useApiQuery('settings', (signal) => api.settings.show(signal));

    if (query.error) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader title="Réglages" />
                <Panel>
                    <ErrorState error={query.error} onRetry={query.reload} />
                </Panel>
            </div>
        );
    }

    if (!query.data) {
        return (
            <div className="flex flex-col gap-6" aria-busy="true">
                <PageHeader title="Réglages" />
                {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-48 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return <SettingsEditor initial={query.data} />;
}
