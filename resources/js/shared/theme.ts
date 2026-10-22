import { useSyncExternalStore } from 'react';

/**
 * Night / day theme. partials/theme-init.blade.php applies the stored choice before
 * first paint; this module keeps <html data-theme>, color-scheme, the browser
 * theme-color and localStorage in sync afterwards.
 */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rp-theme';
const THEME_COLORS: Record<Theme, string> = { dark: '#0b0a09', light: '#f4efe7' };
const listeners = new Set<() => void>();

export function getTheme(): Theme {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function applyThemeColor(theme: Theme = getTheme()): void {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

export function setTheme(theme: Theme): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    applyThemeColor(theme);

    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // Private mode or storage disabled: the choice lasts for this page only.
    }

    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

export function useTheme(): [Theme, (theme: Theme) => void] {
    const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme);

    return [theme, setTheme];
}
