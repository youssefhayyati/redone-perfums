import { createElement, Fragment, type ReactNode } from 'react';
import { getLocale, type Locale } from '@shared/locale';
import { ar } from './ar';

/** A storefront message, written in French; ./ar.ts must translate every one. */
export type Message = keyof typeof ar;

/**
 * The storefront's copy is written in French in the components; on Arabic pages `t()`
 * returns its translation from ./ar.ts. `{name}` placeholders are filled from `params`.
 * Only messages listed in ./ar.ts type-check, so none can stay untranslated.
 */
export function t(message: Message, params?: Record<string, string | number>): string {
    const template: string = getLocale() === 'ar' ? ar[message] : message;

    return params ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match)) : template;
}

/**
 * Like t(), with placeholders filled by elements: `tNodes('Plus que {amount}…', { amount: <strong>…</strong> })`.
 * The sentence keeps each language's own word order around the element.
 */
export function tNodes(message: Message, params: Record<string, ReactNode>): ReactNode[] {
    const template: string = getLocale() === 'ar' ? ar[message] : message;

    return template.split(/(\{\w+\})/).map((part, index) => {
        const name = /^\{(\w+)\}$/.exec(part)?.[1];

        return name !== undefined && name in params ? createElement(Fragment, { key: index }, params[name]) : part;
    });
}

type ArabicForms = { one: string; two: string; few: string; many: string; other: string };

/**
 * Counted nouns. French has two forms; Arabic has one, two, few (3–10), many (11–99)
 * and other (0, 100…), with the number written into the phrase as `{n}`.
 */
const NOUNS = {
    parfum: { fr: ['parfum', 'parfums'], ar: { one: 'عطر واحد', two: 'عطران', few: '{n} عطور', many: '{n} عطرًا', other: '{n} عطر' } },
    article: { fr: ['article', 'articles'], ar: { one: 'منتج واحد', two: 'منتجان', few: '{n} منتجات', many: '{n} منتجًا', other: '{n} منتج' } },
    flacon: { fr: ['flacon', 'flacons'], ar: { one: 'قارورة واحدة', two: 'قارورتان', few: '{n} قوارير', many: '{n} قارورة', other: '{n} قارورة' } },
    coffret: { fr: ['coffret', 'coffrets'], ar: { one: 'علبة واحدة', two: 'علبتان', few: '{n} علب', many: '{n} علبة', other: '{n} علبة' } },
    famille: { fr: ['famille', 'familles'], ar: { one: 'عائلة واحدة', two: 'عائلتان', few: '{n} عائلات', many: '{n} عائلة', other: '{n} عائلة' } },
    univers: { fr: ['univers', 'univers'], ar: { one: 'عالم واحد', two: 'عالمان', few: '{n} عوالم', many: '{n} عالمًا', other: '{n} عالم' } },
    résultat: { fr: ['résultat', 'résultats'], ar: { one: 'نتيجة واحدة', two: 'نتيجتان', few: '{n} نتائج', many: '{n} نتيجة', other: '{n} نتيجة' } },
} satisfies Record<string, { fr: [string, string]; ar: ArabicForms }>;

export type CountedNoun = keyof typeof NOUNS;

const frenchPlurals = new Intl.PluralRules('fr');
const arabicPlurals = new Intl.PluralRules('ar');

/** "3 parfums" on French pages, "3 عطور" on Arabic ones. */
export function tn(count: number, noun: CountedNoun): string {
    const forms = NOUNS[noun];

    if (getLocale() === 'ar') {
        const category = arabicPlurals.select(count);
        const template = category === 'zero' ? forms.ar.other : forms.ar[category as keyof ArabicForms];

        return template.replace('{n}', String(count));
    }

    return `${count} ${frenchPlurals.select(count) === 'one' ? forms.fr[0] : forms.fr[1]}`;
}

/** The storefront path in a language: "/boutique" or "/ar/boutique". */
export function localizedPath(path: string, locale: Locale): string {
    if (locale !== 'ar') {
        return path;
    }

    return path === '/' ? '/ar' : `/ar${path}`;
}
