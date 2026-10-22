<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'description', 'sort_order', 'name_ar', 'description_ar'])]
class FragranceFamily extends Model
{
    use HasFactory, HasTranslations;

    /** Columns with an Arabic `_ar` sibling (see HasTranslations). */
    public const TRANSLATABLE = ['name', 'description'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
