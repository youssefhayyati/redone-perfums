import { createElement, Fragment, type ReactNode } from 'react';
import { getLocale, type Locale } from '@shared/locale';
import { ar } from './ar';
import { en } from './en';

/** A storefront message, written in French; ./ar.ts and ./en.ts must translate every one. */
export type Message = keyof typeof ar;

/** The message in the page's language: the French original, or its translation. */
function template(message: Message): string {
    switch (getLocale()) {
        case 'ar':
            return ar[message];
        case 'en':
            return en[message];
        default:
            return message;
    }
}

/**
 * The storefront's copy is written in French in the components; on Arabic and English
 * pages `t()` returns its translation from ./ar.ts or ./en.ts. `{name}` placeholders are
 * filled from `params`. Only messages listed in ./ar.ts type-check, and ./en.ts must
 * list every one of them, so none can stay untranslated.
 */
export function t(message: Message, params?: Record<string, string | number>): string {
    const text = template(message);

    return params ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match)) : text;
}

/**
 * Like t(), with placeholders filled by elements: `tNodes('Plus que {amount}…', { amount: <strong>…</strong> })`.
 * The sentence keeps each language's own word order around the element.
 */
export function tNodes(message: Message, params: Record<string, ReactNode>): ReactNode[] {
    return template(message)
        .split(/(\{\w+\})/)
        .map((part, index) => {
            const name = /^\{(\w+)\}$/.exec(part)?.[1];

            return name !== undefined && name in params ? createElement(Fragment, { key: index }, params[name]) : part;
        });
}

type ArabicForms = { one: string; two: string; few: string; many: string; other: string };

/**
 * Counted nouns. French and English have two forms (French puts 0 in the singular,
 * English in the plural); Arabic has one, two, few (3–10), many (11–99) and other
 * (0, 100…), with the number written into the phrase as `{n}`.
 */
const NOUNS = {
    parfum: {
        fr: ['parfum', 'parfums'],
        en: ['perfume', 'perfumes'],
        ar: { one: 'عطر واحد', two: 'عطران', few: '{n} عطور', many: '{n} عطرًا', other: '{n} عطر' },
    },
    article: {
        fr: ['article', 'articles'],
        en: ['item', 'items'],
        ar: { one: 'منتج واحد', two: 'منتجان', few: '{n} منتجات', many: '{n} منتجًا', other: '{n} منتج' },
    },
    flacon: {
        fr: ['flacon', 'flacons'],
        en: ['bottle', 'bottles'],
        ar: { one: 'قارورة واحدة', two: 'قارورتان', few: '{n} قوارير', many: '{n} قارورة', other: '{n} قارورة' },
    },
    coffret: {
        fr: ['coffret', 'coffrets'],
        en: ['gift set', 'gift sets'],
        ar: { one: 'علبة واحدة', two: 'علبتان', few: '{n} علب', many: '{n} علبة', other: '{n} علبة' },
    },
    famille: {
        fr: ['famille', 'familles'],
        en: ['family', 'families'],
        ar: { one: 'عائلة واحدة', two: 'عائلتان', few: '{n} عائلات', many: '{n} عائلة', other: '{n} عائلة' },
    },
    univers: {
        fr: ['univers', 'univers'],
        en: ['world', 'worlds'],
        ar: { one: 'عالم واحد', two: 'عالمان', few: '{n} عوالم', many: '{n} عالمًا', other: '{n} عالم' },
    },
    résultat: {
        fr: ['résultat', 'résultats'],
        en: ['result', 'results'],
        ar: { one: 'نتيجة واحدة', two: 'نتيجتان', few: '{n} نتائج', many: '{n} نتيجة', other: '{n} نتيجة' },
    },
    étape: {
        fr: ['étape', 'étapes'],
        en: ['step', 'steps'],
        ar: { one: 'مرحلة واحدة', two: 'مرحلتان', few: '{n} مراحل', many: '{n} مرحلة', other: '{n} مرحلة' },
    },
} satisfies Record<string, { fr: [string, string]; en: [string, string]; ar: ArabicForms }>;

export type CountedNoun = keyof typeof NOUNS;

const frenchPlurals = new Intl.PluralRules('fr');
const englishPlurals = new Intl.PluralRules('en');
const arabicPlurals = new Intl.PluralRules('ar');

/** "3 parfums" on French pages, "3 perfumes" on English ones, "3 عطور" on Arabic ones. */
export function tn(count: number, noun: CountedNoun): string {
    const forms = NOUNS[noun];

    switch (getLocale()) {
        case 'ar': {
            const category = arabicPlurals.select(count);
            const template = category === 'zero' ? forms.ar.other : forms.ar[category as keyof ArabicForms];

            return template.replace('{n}', String(count));
        }
        case 'en':
            return `${count} ${englishPlurals.select(count) === 'one' ? forms.en[0] : forms.en[1]}`;
        default:
            return `${count} ${frenchPlurals.select(count) === 'one' ? forms.fr[0] : forms.fr[1]}`;
    }
}

/** The storefront path in a language: "/boutique", "/ar/boutique" or "/en/boutique". */
export function localizedPath(path: string, locale: Locale): string {
    if (locale === 'fr') {
        return path;
    }

    return path === '/' ? `/${locale}` : `/${locale}${path}`;
}
