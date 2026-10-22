import type { City } from '@shared/types';
import { getLocale } from '@shared/locale';
import { formatMoney } from '@shared/money';
import { api } from '../../api';
import { useQuery } from '../../hooks/useQuery';
import { t } from '../../i18n';

interface CitySelectProps {
    id?: string;
    name?: string;
    value: number | null;
    onChange: (cityId: number | null) => void;
    className?: string;
    invalid?: boolean;
    describedBy?: string;
}

export function useCities() {
    return useQuery('cities', (signal) => api.cities({ signal }), { staleTime: 600_000 });
}

/** Cities grouped by region, with each zone's fee. */
export function CitySelect({ id, name, value, onChange, className = 'field-control', invalid, describedBy }: CitySelectProps) {
    const { data } = useCities();
    const cities = data?.data ?? [];
    const regions = new Map<string, City[]>();

    cities.forEach((city) => {
        const region = city.region ?? t('Autres villes');
        regions.set(region, [...(regions.get(region) ?? []), city]);
    });

    return (
        <select
            id={id}
            name={name}
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
            className={className}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            disabled={!data}
        >
            <option value="">{data ? t('Choisissez votre ville') : t('Chargement des villes…')}</option>
            {[...regions.entries()]
                .sort(([a], [b]) => a.localeCompare(b, getLocale()))
                .map(([region, list]) => (
                    <optgroup key={region} label={region}>
                        {list.map((city) => (
                            <option key={city.id} value={city.id}>
                                {city.name} — {city.fee === 0 ? t('livraison offerte') : formatMoney(city.fee)}
                            </option>
                        ))}
                    </optgroup>
                ))}
        </select>
    );
}
