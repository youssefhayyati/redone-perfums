import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MapPin, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { plural } from '@shared/format';
import { formatMoney, parseDirhams, toDirhamsInput } from '@shared/money';
import * as api from '../api';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/feedback';
import { arabicText, englishText, Field, MoneyInput, SelectInput, Switch, TextInput } from '../components/ui/form';
import { PageHeader, Panel } from '../components/ui/Panel';
import { SearchInput } from '../components/ui/SearchInput';
import { DataTable, Td, Th } from '../components/ui/Table';
import { toast } from '../components/ui/toast';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useListParams } from '../hooks/useListParams';
import { errorText, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../lib/errors';
import type { AdminCity, DeliveryZone } from '../types';
import { parseInteger } from './products/productForm';

const DEFAULTS = { ville: '', zone: '' };

const nullableText = (value: string): string | null => (value.trim() === '' ? null : value.trim());

interface ZoneForm {
    name: string;
    fee: string;
    free_shipping_threshold: string;
    delivery_estimate: string;
    delivery_estimate_ar: string;
    delivery_estimate_en: string;
    is_active: boolean;
    sort_order: string;
}

function ZoneDialog({ zone, open, onClose, onSaved }: { zone: DeliveryZone | null; open: boolean; onClose: () => void; onSaved: (zone: DeliveryZone) => void }) {
    const [form, setForm] = useState<ZoneForm>({ name: '', fee: '', free_shipping_threshold: '', delivery_estimate: '', delivery_estimate_ar: '', delivery_estimate_en: '', is_active: true, sort_order: '0' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setForm({
                name: zone?.name ?? '',
                fee: zone ? toDirhamsInput(zone.fee) : '',
                free_shipping_threshold: toDirhamsInput(zone?.free_shipping_threshold),
                delivery_estimate: zone?.delivery_estimate ?? '',
                delivery_estimate_ar: zone?.delivery_estimate_ar ?? '',
                delivery_estimate_en: zone?.delivery_estimate_en ?? '',
                is_active: zone?.is_active ?? true,
                sort_order: String(zone?.sort_order ?? 0),
            });
            setErrors({});
        }
    }, [open, zone]);

    const set = <K extends keyof ZoneForm>(key: K, value: ZoneForm[K]) => setForm((current) => ({ ...current, [key]: value }));

    async function submit(event: FormEvent) {
        event.preventDefault();
        const local: FieldErrors = {};
        const fee = parseDirhams(form.fee);
        const threshold = form.free_shipping_threshold.trim() === '' ? null : parseDirhams(form.free_shipping_threshold);
        if (form.name.trim() === '') {
            local.name = 'Indiquez un nom de zone.';
        }
        if (fee === null) {
            local.fee = form.fee.trim() === '' ? 'Indiquez les frais (0 pour gratuit).' : 'Montant invalide (ex. 35).';
        }
        if (form.free_shipping_threshold.trim() !== '' && threshold === null) {
            local.free_shipping_threshold = 'Montant invalide (ex. 800).';
        }
        if (hasErrors(local)) {
            setErrors(local);
            focusFirstInvalid();

            return;
        }
        setBusy(true);
        try {
            const payload = {
                name: form.name.trim(),
                fee: fee ?? 0,
                free_shipping_threshold: threshold,
                delivery_estimate: nullableText(form.delivery_estimate),
                delivery_estimate_ar: nullableText(form.delivery_estimate_ar),
                delivery_estimate_en: nullableText(form.delivery_estimate_en),
                is_active: form.is_active,
                sort_order: parseInteger(form.sort_order) ?? 0,
            };
            const saved = zone ? await api.zones.update(zone.id, payload) : await api.zones.create(payload);
            onSaved(saved);
            toast.success(zone ? 'Zone enregistrée.' : 'Zone créée.');
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
            title={zone ? `Modifier la zone « ${zone.name} »` : 'Nouvelle zone de livraison'}
            footer={
                <>
                    <Button onClick={onClose} disabled={busy}>
                        Annuler
                    </Button>
                    <Button type="submit" form="zone-form" variant="primary" loading={busy}>
                        {zone ? 'Enregistrer' : 'Créer la zone'}
                    </Button>
                </>
            }
        >
            <form id="zone-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                <Field label="Nom" required error={errors.name}>
                    {(control) => <TextInput {...control} value={form.name} maxLength={120} placeholder="Ex. Grand Casablanca" onChange={(event) => set('name', event.target.value)} data-autofocus />}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Frais de livraison" required error={errors.fee}>
                        {(control) => <MoneyInput {...control} value={form.fee} onChange={(event) => set('fee', event.target.value)} />}
                    </Field>
                    <Field label="Offerte dès" optional error={errors.free_shipping_threshold} hint="Montant des articles après remise.">
                        {(control) => <MoneyInput {...control} value={form.free_shipping_threshold} placeholder="Jamais" onChange={(event) => set('free_shipping_threshold', event.target.value)} />}
                    </Field>
                </div>
                <Field label="Délai annoncé" optional error={errors.delivery_estimate} hint="Affiché au client tel quel ; laissé vide, aucun délai n’est promis.">
                    {(control) => <TextInput {...control} value={form.delivery_estimate} maxLength={120} placeholder="Ex. 24 à 48 h ouvrées" onChange={(event) => set('delivery_estimate', event.target.value)} />}
                </Field>
                <Field label="Délai annoncé en arabe" optional error={errors.delivery_estimate_ar} hint="Laissé vide, le délai français s’affiche sur la boutique en arabe.">
                    {(control) => (
                        <TextInput {...control} {...arabicText} value={form.delivery_estimate_ar} maxLength={120} placeholder="مثال: من 24 إلى 48 ساعة عمل" onChange={(event) => set('delivery_estimate_ar', event.target.value)} />
                    )}
                </Field>
                <Field label="Délai annoncé en anglais" optional error={errors.delivery_estimate_en} hint="Laissé vide, le délai français s’affiche sur la boutique en anglais.">
                    {(control) => (
                        <TextInput {...control} {...englishText} value={form.delivery_estimate_en} maxLength={120} placeholder="Ex. 24 to 48 working hours" onChange={(event) => set('delivery_estimate_en', event.target.value)} />
                    )}
                </Field>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <Switch checked={form.is_active} onChange={(value) => set('is_active', value)} label="Zone active" description="Inactive, ses villes ne sont plus livrables." />
                    <Field label="Ordre" error={errors.sort_order}>
                        {(control) => <TextInput {...control} inputMode="numeric" className="w-24 tabular-nums" value={form.sort_order} onChange={(event) => set('sort_order', event.target.value)} />}
                    </Field>
                </div>
            </form>
        </Dialog>
    );
}

interface CityForm {
    name: string;
    region: string;
    name_ar: string;
    name_en: string;
    region_ar: string;
    region_en: string;
    delivery_zone_id: string;
    is_active: boolean;
}

function CityDialog({ city, zones, open, onClose, onSaved }: { city: AdminCity | null; zones: DeliveryZone[]; open: boolean; onClose: () => void; onSaved: (city: AdminCity) => void }) {
    const [form, setForm] = useState<CityForm>({ name: '', region: '', name_ar: '', region_ar: '', name_en: '', region_en: '', delivery_zone_id: '', is_active: true });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setForm({
                name: city?.name ?? '',
                region: city?.region ?? '',
                name_ar: city?.name_ar ?? '',
                name_en: city?.name_en ?? '',
                region_ar: city?.region_ar ?? '',
                region_en: city?.region_en ?? '',
                delivery_zone_id: city?.delivery_zone_id ? String(city.delivery_zone_id) : '',
                is_active: city?.is_active ?? true,
            });
            setErrors({});
        }
    }, [open, city]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (form.name.trim() === '') {
            setErrors({ name: 'Indiquez le nom de la ville.' });
            focusFirstInvalid();

            return;
        }
        setBusy(true);
        try {
            const payload = {
                name: form.name.trim(),
                region: nullableText(form.region),
                name_ar: nullableText(form.name_ar),
                name_en: nullableText(form.name_en),
                region_ar: nullableText(form.region_ar),
                region_en: nullableText(form.region_en),
                delivery_zone_id: form.delivery_zone_id === '' ? null : Number(form.delivery_zone_id),
                is_active: form.is_active,
            };
            const saved = city ? await api.cities.update(city.id, payload) : await api.cities.create(payload);
            onSaved(saved);
            toast.success(city ? 'Ville enregistrée.' : 'Ville ajoutée.');
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
            title={city ? `Modifier « ${city.name} »` : 'Nouvelle ville'}
            footer={
                <>
                    <Button onClick={onClose} disabled={busy}>
                        Annuler
                    </Button>
                    <Button type="submit" form="city-form" variant="primary" loading={busy}>
                        {city ? 'Enregistrer' : 'Ajouter la ville'}
                    </Button>
                </>
            }
        >
            <form id="city-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Ville" required error={errors.name}>
                        {(control) => <TextInput {...control} value={form.name} maxLength={120} onChange={(event) => setForm({ ...form, name: event.target.value })} data-autofocus />}
                    </Field>
                    <Field label="Région" optional error={errors.region}>
                        {(control) => <TextInput {...control} value={form.region} maxLength={120} onChange={(event) => setForm({ ...form, region: event.target.value })} />}
                    </Field>
                    <Field label="Ville en arabe" optional error={errors.name_ar}>
                        {(control) => <TextInput {...control} {...arabicText} value={form.name_ar} maxLength={120} placeholder={form.name} onChange={(event) => setForm({ ...form, name_ar: event.target.value })} />}
                    </Field>
                    <Field label="Région en arabe" optional error={errors.region_ar}>
                        {(control) => <TextInput {...control} {...arabicText} value={form.region_ar} maxLength={120} placeholder={form.region} onChange={(event) => setForm({ ...form, region_ar: event.target.value })} />}
                    </Field>
                    <Field label="Ville en anglais" optional error={errors.name_en}>
                        {(control) => <TextInput {...control} {...englishText} value={form.name_en} maxLength={120} placeholder={form.name} onChange={(event) => setForm({ ...form, name_en: event.target.value })} />}
                    </Field>
                    <Field label="Région en anglais" optional error={errors.region_en}>
                        {(control) => <TextInput {...control} {...englishText} value={form.region_en} maxLength={120} placeholder={form.region} onChange={(event) => setForm({ ...form, region_en: event.target.value })} />}
                    </Field>
                </div>
                <Field label="Zone de livraison" error={errors.delivery_zone_id} hint="Sans zone, la ville n’est pas livrable.">
                    {(control) => (
                        <SelectInput {...control} value={form.delivery_zone_id} onChange={(event) => setForm({ ...form, delivery_zone_id: event.target.value })}>
                            <option value="">Aucune zone</option>
                            {zones.map((zone) => (
                                <option key={zone.id} value={zone.id}>
                                    {zone.name} · {zone.fee === 0 ? 'gratuite' : formatMoney(zone.fee)}
                                    {!zone.is_active ? ' (inactive)' : ''}
                                </option>
                            ))}
                        </SelectInput>
                    )}
                </Field>
                <Switch checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} label="Ville active" description="Proposée au client lors de la commande." />
            </form>
        </Dialog>
    );
}

export default function DeliveryPage() {
    useDocumentTitle('Livraison');
    const zonesQuery = useApiQuery('zones', (signal) => api.zones.list(signal));
    const citiesQuery = useApiQuery('cities', (signal) => api.cities.list(signal));
    const [params, setParams] = useListParams(DEFAULTS);
    const [zoneDialog, setZoneDialog] = useState<{ zone: DeliveryZone | null } | null>(null);
    const [cityDialog, setCityDialog] = useState<{ city: AdminCity | null } | null>(null);
    const [deletingZone, setDeletingZone] = useState<DeliveryZone | null>(null);
    const [deletingCity, setDeletingCity] = useState<AdminCity | null>(null);
    const zones = zonesQuery.data ?? [];

    const cities = useMemo(() => {
        const term = params.ville.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '');
        return (citiesQuery.data ?? []).filter((city) => {
            const name = `${city.name} ${city.region ?? ''} ${city.name_ar ?? ''} ${city.name_en ?? ''}`.toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '');
            const zoneMatch = params.zone === '' || (params.zone === 'none' ? city.delivery_zone_id === null : String(city.delivery_zone_id) === params.zone);

            return zoneMatch && (term === '' || name.includes(term));
        });
    }, [citiesQuery.data, params.ville, params.zone]);

    const upsertZone = (zone: DeliveryZone) => {
        zonesQuery.setData((current) => {
            const list = current ?? [];
            const next = list.some((item) => item.id === zone.id) ? list.map((item) => (item.id === zone.id ? { ...item, ...zone } : item)) : [...list, zone];

            return [...next].sort((a, b) => a.sort_order - b.sort_order);
        });
        citiesQuery.reload();
    };

    const upsertCity = (city: AdminCity) => {
        citiesQuery.setData((current) => {
            const list = current ?? [];
            const next = list.some((item) => item.id === city.id) ? list.map((item) => (item.id === city.id ? city : item)) : [...list, city];

            return [...next].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        });
        zonesQuery.reload();
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Livraison" description="Zones tarifaires et villes desservies. Une ville est livrable si elle est active et rattachée à une zone active." />

            <Panel
                title="Zones de livraison"
                padded={false}
                actions={
                    <Button size="sm" icon={Plus} onClick={() => setZoneDialog({ zone: null })}>
                        Nouvelle zone
                    </Button>
                }
            >
                {zonesQuery.error && !zonesQuery.data ? (
                    <ErrorState error={zonesQuery.error} onRetry={zonesQuery.reload} />
                ) : !zonesQuery.data ? (
                    <TableSkeleton rows={3} columns={5} />
                ) : zones.length === 0 ? (
                    <EmptyState icon={Truck} title="Aucune zone" description="Créez une zone (frais, seuil de gratuité, délai) puis rattachez-y des villes." />
                ) : (
                    <DataTable caption="Zones de livraison">
                        <thead>
                            <tr>
                                <Th>Zone</Th>
                                <Th align="right">Frais</Th>
                                <Th hideBelow="sm" align="right">
                                    Offerte dès
                                </Th>
                                <Th hideBelow="md">Délai</Th>
                                <Th hideBelow="sm" align="right">
                                    Villes
                                </Th>
                                <Th hideBelow="lg">État</Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </tr>
                        </thead>
                        <tbody>
                            {zones.map((zone) => (
                                <tr key={zone.id} className="transition-colors hover:bg-ink/[0.03]">
                                    <Td className="font-medium text-ink">{zone.name}</Td>
                                    <Td align="right" className="whitespace-nowrap tabular-nums">
                                        {zone.fee === 0 ? 'Gratuite' : formatMoney(zone.fee)}
                                    </Td>
                                    <Td hideBelow="sm" align="right" className="whitespace-nowrap tabular-nums text-muted">
                                        {zone.free_shipping_threshold !== null ? formatMoney(zone.free_shipping_threshold) : '—'}
                                    </Td>
                                    <Td hideBelow="md" className="text-muted">
                                        {zone.delivery_estimate ?? '—'}
                                    </Td>
                                    <Td hideBelow="sm" align="right" className="tabular-nums">
                                        <button type="button" onClick={() => setParams({ zone: String(zone.id) })} className="rounded underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                                            {plural(zone.cities_count ?? 0, 'ville')}
                                        </button>
                                    </Td>
                                    <Td hideBelow="lg">{zone.is_active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="muted" dot>Inactive</Badge>}</Td>
                                    <Td align="right" className="whitespace-nowrap">
                                        <IconButton icon={Pencil} size="sm" label={`Modifier la zone ${zone.name}`} onClick={() => setZoneDialog({ zone })} />
                                        <IconButton icon={Trash2} size="sm" variant="danger" label={`Supprimer la zone ${zone.name}`} onClick={() => setDeletingZone(zone)} />
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </DataTable>
                )}
            </Panel>

            <Panel
                title="Villes"
                description={citiesQuery.data ? `${plural(citiesQuery.data.length, 'ville')} au total` : undefined}
                padded={false}
                actions={
                    <Button size="sm" icon={Plus} onClick={() => setCityDialog({ city: null })}>
                        Nouvelle ville
                    </Button>
                }
            >
                <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:px-5">
                    <SearchInput className="sm:w-72" label="Rechercher une ville" placeholder="Ville ou région" value={params.ville} onChange={(ville) => setParams({ ville }, { replace: true })} delay={150} />
                    <SelectInput aria-label="Filtrer par zone" className="sm:w-56" value={params.zone} onChange={(event) => setParams({ zone: event.target.value })}>
                        <option value="">Toutes les zones</option>
                        {zones.map((zone) => (
                            <option key={zone.id} value={zone.id}>
                                {zone.name}
                            </option>
                        ))}
                        <option value="none">Sans zone (non livrables)</option>
                    </SelectInput>
                </div>
                {citiesQuery.error && !citiesQuery.data ? (
                    <ErrorState error={citiesQuery.error} onRetry={citiesQuery.reload} />
                ) : !citiesQuery.data ? (
                    <TableSkeleton rows={6} columns={4} />
                ) : cities.length === 0 ? (
                    <EmptyState icon={MapPin} title={citiesQuery.data.length === 0 ? 'Aucune ville' : 'Aucune ville ne correspond'} />
                ) : (
                    <div className="max-h-[36rem] overflow-y-auto border-t border-line">
                        <DataTable caption="Villes desservies">
                            <thead className="sticky top-0 z-[1] bg-raised">
                                <tr>
                                    <Th>Ville</Th>
                                    <Th hideBelow="sm">Région</Th>
                                    <Th>Zone</Th>
                                    <Th hideBelow="md">État</Th>
                                    <Th align="right">
                                        <span className="sr-only">Actions</span>
                                    </Th>
                                </tr>
                            </thead>
                            <tbody>
                                {cities.map((city) => {
                                    const zone = zones.find((item) => item.id === city.delivery_zone_id);
                                    const deliverable = city.is_active && zone?.is_active;

                                    return (
                                        <tr key={city.id} className="transition-colors hover:bg-ink/[0.03]">
                                            <Td>
                                                <span className="block font-medium text-ink">{city.name}</span>
                                                {city.name_ar && (
                                                    <span lang="ar" dir="rtl" className="text-xs text-muted">
                                                        {city.name_ar}
                                                    </span>
                                                )}
                                            </Td>
                                            <Td hideBelow="sm" className="text-muted">
                                                {city.region ?? '—'}
                                            </Td>
                                            <Td className="text-sm">{city.zone?.name ?? <span className="text-warning">Aucune</span>}</Td>
                                            <Td hideBelow="md">{deliverable ? <Badge tone="success" dot>Livrable</Badge> : <Badge tone="muted" dot>{city.is_active ? 'Zone inactive' : 'Inactive'}</Badge>}</Td>
                                            <Td align="right" className="whitespace-nowrap">
                                                <IconButton icon={Pencil} size="sm" label={`Modifier ${city.name}`} onClick={() => setCityDialog({ city })} />
                                                <IconButton icon={Trash2} size="sm" variant="danger" label={`Supprimer ${city.name}`} onClick={() => setDeletingCity(city)} />
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </DataTable>
                    </div>
                )}
            </Panel>

            <ZoneDialog zone={zoneDialog?.zone ?? null} open={zoneDialog !== null} onClose={() => setZoneDialog(null)} onSaved={upsertZone} />
            <CityDialog city={cityDialog?.city ?? null} zones={zones} open={cityDialog !== null} onClose={() => setCityDialog(null)} onSaved={upsertCity} />
            <ConfirmDialog
                open={deletingZone !== null}
                onClose={() => setDeletingZone(null)}
                title={`Supprimer la zone « ${deletingZone?.name ?? ''} » ?`}
                description={
                    deletingZone && (deletingZone.cities_count ?? 0) > 0
                        ? `${plural(deletingZone.cities_count ?? 0, 'ville deviendra', 'villes deviendront')} non livrable${(deletingZone.cities_count ?? 0) > 1 ? 's' : ''} jusqu’à leur rattachement à une autre zone.`
                        : 'Aucune ville n’est rattachée à cette zone.'
                }
                confirmLabel="Supprimer"
                onConfirm={async () => {
                    if (!deletingZone) {
                        return;
                    }
                    await api.zones.remove(deletingZone.id);
                    zonesQuery.setData((current) => current?.filter((item) => item.id !== deletingZone.id));
                    citiesQuery.reload();
                    toast.success('Zone supprimée.');
                }}
            />
            <ConfirmDialog
                open={deletingCity !== null}
                onClose={() => setDeletingCity(null)}
                title={`Supprimer « ${deletingCity?.name ?? ''} » ?`}
                description="Les commandes passées conservent le nom de la ville."
                confirmLabel="Supprimer"
                onConfirm={async () => {
                    if (!deletingCity) {
                        return;
                    }
                    await api.cities.remove(deletingCity.id);
                    citiesQuery.setData((current) => current?.filter((item) => item.id !== deletingCity.id));
                    zonesQuery.reload();
                    toast.success('Ville supprimée.');
                }}
            />
        </div>
    );
}
