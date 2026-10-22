<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use App\Support\MediaUrl;
use Database\Factories\ProcessStepFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * One step of making a perfume, shown in the homepage's "Le laboratoire" section.
 */
#[Fillable([
    'title', 'body', 'detail', 'image_path', 'image_credit', 'sort_order', 'is_visible',
    'title_ar', 'body_ar', 'detail_ar',
    'title_en', 'body_en', 'detail_en',
])]
class ProcessStep extends Model
{
    /** @use HasFactory<ProcessStepFactory> */
    use HasFactory, HasTranslations;

    /** Columns with Arabic `_ar` and English `_en` siblings (see HasTranslations). */
    public const TRANSLATABLE = ['title', 'body', 'detail'];

    /** @var array<string, mixed> */
    protected $attributes = ['is_visible' => true, 'is_demo' => false];

    protected function casts(): array
    {
        return [
            'is_visible' => 'boolean',
            'is_demo' => 'boolean',
        ];
    }

    /** Visible steps, in the order they are told. */
    #[Scope]
    protected function told(Builder $query): void
    {
        $query->where('is_visible', true)->orderBy('sort_order')->orderBy('id');
    }

    public function imageUrl(): ?string
    {
        return MediaUrl::for($this->image_path);
    }
}
