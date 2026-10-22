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
    { key: 'location.coordinates', group: 'location', type: 'string', label: 'Coordonnées GPS', value: null },
    { key: 'location.zoom', group: 'location', type: 'integer', label: 'Zoom de la carte', value: 16 },
    { key: 'analytics.ga4_id', group: 'analytics', type: 'string', label: 'Google Analytics 4', value: null },
    { key: 'analytics.meta_pixel_id', group: 'analytics', type: 'string', label: 'Meta Pixel', value: null },
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

    it('checks the map position and zoom', () => {
        const draft = settingsToDraft(fields);
        expect(validateSettings(fields, { ...draft, 'location.coordinates': '33.5899, -7.6039', 'location.zoom': '18' })).toEqual({});

        const errors = validateSettings(fields, { ...draft, 'location.coordinates': '95, -7.6', 'location.zoom': '25' });
        expect(errors['location.coordinates']).toMatch(/latitude, longitude/);
        expect(errors['location.zoom']).toMatch(/de 3/);
        expect(validateSettings(fields, { ...draft, 'location.coordinates': 'https://maps.app.goo.gl/x1Y2z3' })['location.coordinates']).toMatch(/clic droit/);
    });

    it('checks the tracking identifiers', () => {
        const draft = settingsToDraft(fields);
        expect(validateSettings(fields, { ...draft, 'analytics.ga4_id': 'G-AB12CD34EF', 'analytics.meta_pixel_id': '123456789012345' })).toEqual({});

        const errors = validateSettings(fields, { ...draft, 'analytics.ga4_id': 'UA-1234-1', 'analytics.meta_pixel_id': 'fbq-12' });
        expect(errors['analytics.ga4_id']).toMatch(/G-XXXXXXXXXX/);
        expect(errors['analytics.meta_pixel_id']).toMatch(/chiffres/);
    });
});
