import { useEffect } from 'react';
import { useConfig } from '../config';

function setMeta(name: string, content: string): void {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

    if (element === null) {
        element = document.createElement('meta');
        element.name = name;
        document.head.appendChild(element);
    }

    element.content = content;
}

/**
 * Document title and description for client-side navigations. The server renders the
 * same values for the first load (SpaController), so shared links stay accurate.
 */
export function useHead({ title, description, noindex = false }: { title?: string | null; description?: string | null; noindex?: boolean }): void {
    const { store } = useConfig();

    useEffect(() => {
        document.title = title ? `${title} — ${store.name}` : `${store.name} — ${store.descriptor}`;
        setMeta('description', description || store.meta_description);

        const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
        if (noindex) {
            setMeta('robots', 'noindex, nofollow');
        } else {
            robots?.remove();
        }
    }, [title, description, noindex, store]);
}
