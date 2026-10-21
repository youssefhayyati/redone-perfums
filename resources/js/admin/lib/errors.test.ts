import { describe, expect, it } from 'vitest';
import { ApiError } from '@shared/http';
import { firstError, pickErrors, toFieldErrors } from './errors';

describe('field errors', () => {
    const error = new ApiError(422, 'Erreur', {
        name: ['Le nom est obligatoire.'],
        'variants.0.sku': ['Cette référence est déjà utilisée.', 'Autre'],
        'notes.top.2': ['Trop long.'],
    });

    it('keeps the first message per Laravel key', () => {
        expect(toFieldErrors(error)).toEqual({
            name: 'Le nom est obligatoire.',
            'variants.0.sku': 'Cette référence est déjà utilisée.',
            'notes.top.2': 'Trop long.',
        });
        expect(toFieldErrors(new Error('x'))).toEqual({});
    });

    it('picks nested errors and finds the first under a prefix', () => {
        const fields = toFieldErrors(error);
        expect(pickErrors(fields, 'variants.0')).toEqual({ sku: 'Cette référence est déjà utilisée.' });
        expect(firstError(fields, 'notes.top')).toBe('Trop long.');
        expect(firstError(fields, 'notes.base')).toBeUndefined();
    });
});
