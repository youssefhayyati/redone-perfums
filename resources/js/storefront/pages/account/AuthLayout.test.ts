import { describe, expect, it } from 'vitest';
import { safeRedirect } from './AuthLayout';

describe('safeRedirect', () => {
    it('accepts internal paths', () => {
        expect(safeRedirect('/compte/commandes/RP-1')).toBe('/compte/commandes/RP-1');
    });

    it.each([null, '', 'https://evil.example', '//evil.example', 'javascript:alert(1)'])('falls back for %s', (target) => {
        expect(safeRedirect(target)).toBe('/compte');
    });
});
