import { describe, expect, it } from 'vitest';
import type { SettingField } from '../../types';
import { settingsChanges, settingsErrors, settingsToDraft, validateSettings } from './settingsForm';

const fields: SettingField[] = [
    { key: 'store.name', group: 'general', type: 'string', label: 'Nom de la boutique', value: 'Redone Parfums' },
    { key: 'announcement.enabled', group: 'announcement', type: 'boolean', label: 'Afficher la barre d’annonce', value: true },
    { key: 'announcement.link', group: 'announcement', type: 'string', label: 'Lien', value: null },
    { key: 'contact.email', group: 'contact', type: 'string', label: 'E-mail de contact', value: null },
    { key: 'social.instagram', group: 'social', type: 'url', label: 'Instagram', value: null },
    { key: 'home.story_product_id', group: 'homepage', type: 'integer', label: 'Récit — parfum', value: 4 },
];

describe('settings form', () => {
    it('only sends changed values, typed for the API', () => {
        const draft = settingsToDraft(fields);
        expect(settingsChanges(fields, draft)).toEqual({});

        draft['store.name'] = ' Redone ';
        draft['announcement.enabled'] = false;
        draft['home.story_product_id'] = '7';
        draft['contact.email'] = '';
        expect(settingsChanges(fields, draft)).toEqual({ 'store.name': 'Redone', 'announcement.enabled': false, 'home.story_product_id': 7 });

        draft['home.story_product_id'] = '';
        expect(settingsChanges(fields, draft)['home.story_product_id']).toBeNull();
    });

    it('validates URLs, integers and internal links', () => {
        const draft = { ...settingsToDraft(fields), 'social.instagram': 'instagram.com/redone', 'home.story_product_id': 'abc', 'announcement.link': 'https://x' };
        expect(Object.keys(validateSettings(fields, draft)).sort()).toEqual(['announcement.link', 'home.story_product_id', 'social.instagram']);
    });

    it('maps API error keys and names the field', () => {
        const mapped = settingsErrors({ 'values.contact.email': 'Le champ values.contact.email doit être une adresse e-mail valide.' }, fields);
        expect(mapped).toEqual({ 'contact.email': 'Le champ « e-mail de contact » doit être une adresse e-mail valide.' });
    });
});
