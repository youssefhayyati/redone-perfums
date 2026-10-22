<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable([
    'name', 'slug', 'tagline', 'description', 'image_path', 'accent_color',
    'is_visible', 'is_featured', 'sort_order',
    'name_ar', 'tagline_ar', 'description_ar',
])]
class Collection extends Model
{
    use HasFactory, HasTranslations;

    /** Columns with an Arabic `_ar` sibling (see HasTranslations). */
    public const TRANSLATABLE = ['name', 'tagline', 'description'];

    protected function casts(): array
    {
        return [
            'is_visible' => 'boolean',
            'is_featured' => 'boolean',
            'is_demo' => 'boolean',
        ];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class)
            ->withPivot('sort_order')
            ->orderByPivot('sort_order');
    }

    public function imageUrl(): ?string
    {
        return MediaUrl::for($this->image_path);
    }
}
