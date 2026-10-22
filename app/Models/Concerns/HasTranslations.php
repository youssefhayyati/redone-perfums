<?php

namespace App\Models\Concerns;

use App\Support\Locale;

/**
 * Columns with an Arabic sibling (`name` / `name_ar`). The French original is the
 * reference; the Arabic version is used on Arabic requests whenever it is filled.
 */
trait HasTranslations
{
    /**
     * The attribute in the current language, e.g. `$product->translated('name')`.
     */
    public function translated(string $attribute): mixed
    {
        if (Locale::isArabic()) {
            $arabic = $this->getAttribute($attribute.'_ar');

            if ($arabic !== null && $arabic !== '') {
                return $arabic;
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
                $columns[] = $translatable.'_ar';
            }
        }

        return $columns;
    }
}
