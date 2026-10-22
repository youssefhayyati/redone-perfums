<?php

namespace App\Models\Concerns;

use App\Support\Locale;

/**
 * Columns with an Arabic and an English sibling (`name` / `name_ar` / `name_en`). The
 * French original is the reference; a translation is used on requests in its language
 * whenever it is filled.
 */
trait HasTranslations
{
    /**
     * The attribute in the current language, e.g. `$product->translated('name')`.
     */
    public function translated(string $attribute): mixed
    {
        $locale = Locale::translation();

        if ($locale !== null) {
            $translation = $this->getAttribute($attribute.'_'.$locale);

            if ($translation !== null && $translation !== '') {
                return $translation;
            }
        }

        return $this->getAttribute($attribute);
    }

    /**
     * Columns to select alongside `$attributes` so translated() can read them,
     * e.g. `->get(Collection::withTranslations(['slug', 'name']))`.
     *
     * @param  list<string>  $attributes
     * @return list<string>
     */
    public static function withTranslations(array $attributes): array
    {
        $columns = $attributes;

        foreach (static::TRANSLATABLE as $translatable) {
            if (in_array($translatable, $attributes, true)) {
                foreach (Locale::TRANSLATED as $locale) {
                    $columns[] = $translatable.'_'.$locale;
                }
            }
        }

        return $columns;
    }
}
