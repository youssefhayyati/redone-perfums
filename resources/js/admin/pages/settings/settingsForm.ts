import type { FieldErrors } from '../../lib/errors';
import type { SettingField, SettingValue } from '../../types';

/**
 * Store settings come as a flat list of typed fields. The form keeps text inputs as
 * strings and switches as booleans; only the values that changed are sent back, so
 * an untouched invalid legacy value never blocks a save.
 */
export type SettingsDraft = Record<string, string | boolean>;

export const SETTING_GROUPS: Array<{ key: string; label: string; description?: string }> = [
    { key: 'general', label: 'Boutique', description: 'Nom, logotype et description par défaut pour les moteurs de recherche.' },
    { key: 'announcement', label: 'Barre d’annonce', description: 'Bandeau affiché en haut de toutes les pages.' },
    { key: 'contact', label: 'Contact', description: 'Coordonnées affichées sur la boutique et dans les e-mails.' },
    { key: 'social', label: 'Réseaux sociaux', description: 'Adresses complètes commençant par https://.' },
    { key: 'payment', label: 'Paiement et commande' },
    { key: 'benefits', label: 'Avantages' },
    { key: 'homepage', label: 'Page d’accueil', description: 'Textes du hero et du récit mis en avant.' },
];

export function settingsToDraft(fields: SettingField[]): SettingsDraft {
    const draft: SettingsDraft = {};
    for (const field of fields) {
        draft[field.key] = field.type === 'boolean' ? Boolean(field.value) : field.value === null || field.value === undefined ? '' : String(field.value);
    }

    return draft;
}

function toApiValue(field: SettingField, value: string | boolean): SettingValue {
    if (field.type === 'boolean') {
        return Boolean(value);
    }
    const text = String(value).trim();
    if (text === '') {
        return null;
    }

    return field.type === 'integer' ? Number(text) : text;
}

/** Values that differ from what the API sent, in API form. */
export function settingsChanges(fields: SettingField[], draft: SettingsDraft): Record<string, SettingValue> {
    const changes: Record<string, SettingValue> = {};
    for (const field of fields) {
        const next = toApiValue(field, draft[field.key] ?? '');
        const current = field.type === 'boolean' ? Boolean(field.value) : field.value === '' ? null : field.value;
        if (next !== current && !(field.type === 'integer' && current !== null && Number(current) === next)) {
            changes[field.key] = next;
        }
    }

    return changes;
}

/** Client-side checks: integers and https URLs. */
export function validateSettings(fields: SettingField[], draft: SettingsDraft): FieldErrors {
    const errors: FieldErrors = {};
    for (const field of fields) {
        const value = String(draft[field.key] ?? '').trim();
        if (value === '') {
            continue;
        }
        if (field.type === 'integer' && !/^\d+$/.test(value)) {
            errors[field.key] = 'Nombre entier attendu.';
        }
        if (field.type === 'url' && !/^https:\/\/\S+$/i.test(value)) {
            errors[field.key] = 'Adresse complète commençant par https:// attendue.';
        }
        if (field.key === 'announcement.link' && !/^\/[A-Za-z0-9/_\-?=&]*$/.test(value)) {
            errors[field.key] = 'Le lien doit être un chemin interne commençant par « / ».';
        }
    }

    return errors;
}

/**
 * API errors are keyed `values.contact.email` and their text repeats that raw key;
 * strip the prefix and name the field by its label instead.
 */
export function settingsErrors(errors: FieldErrors, fields: SettingField[]): FieldErrors {
    const labels = new Map(fields.map((field) => [field.key, field.label]));
    const mapped: FieldErrors = {};
    for (const [key, message] of Object.entries(errors)) {
        const settingKey = key.startsWith('values.') ? key.slice('values.'.length) : key;
        const label = labels.get(settingKey);
        mapped[settingKey] = label ? message.split(`values.${settingKey}`).join(`« ${label.toLowerCase()} »`) : message;
    }

    return mapped;
}
