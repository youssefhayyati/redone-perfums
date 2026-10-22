<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['slug', 'title', 'body', 'meta_description', 'is_published', 'sort_order', 'title_ar', 'body_ar', 'meta_description_ar', 'title_en', 'body_en', 'meta_description_en'])]
class Page extends Model
{
    use HasTranslations;

    /** Columns with Arabic `_ar` and English `_en` siblings (see HasTranslations). */
    public const TRANSLATABLE = ['title', 'body', 'meta_description'];

    protected function casts(): array
    {
        return ['is_published' => 'boolean'];
    }
}
