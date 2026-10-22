<?php

namespace App\Models;

use App\Enums\NoteLayer;
use App\Enums\ProductStatus;
use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'fragrance_family_id', 'name', 'slug', 'tagline', 'description', 'inspiration',
    'concentration', 'gender', 'longevity', 'sillage', 'status', 'is_featured', 'badge',
    'accent_color', 'sort_order', 'meta_title', 'meta_description', 'published_at',
    'name_ar', 'tagline_ar', 'description_ar', 'inspiration_ar', 'concentration_ar', 'meta_title_ar', 'meta_description_ar',
])]
class Product extends Model
{
    use HasFactory, HasTranslations, SoftDeletes;

    /** Columns with an Arabic `_ar` sibling (see HasTranslations). */
    public const TRANSLATABLE = ['name', 'tagline', 'description', 'inspiration', 'concentration', 'meta_title', 'meta_description'];

    public const BADGES = ['new', 'bestseller', 'limited'];

    public const GENDERS = ['feminin', 'masculin', 'mixte'];

    protected function casts(): array
    {
        return [
            'status' => ProductStatus::class,
            'is_featured' => 'boolean',
            'is_demo' => 'boolean',
            'longevity' => 'integer',
            'sillage' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(FragranceFamily::class, 'fragrance_family_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order')->orderBy('size_ml');
    }

    public function activeVariants(): HasMany
    {
        return $this->variants()->where('is_active', true);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order')->orderBy('id');
    }

    public function notes(): BelongsToMany
    {
        return $this->belongsToMany(Note::class)
            ->withPivot(['layer', 'sort_order'])
            ->orderByPivot('sort_order');
    }

    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class)->withPivot('sort_order');
    }

    /** Visible on the storefront. */
    #[Scope]
    protected function published(Builder $query): void
    {
        $query->where('status', ProductStatus::Active)
            ->where(fn (Builder $q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()));
    }

    public function isPublished(): bool
    {
        return $this->status === ProductStatus::Active
            && ! $this->trashed()
            && ($this->published_at === null || $this->published_at->isPast());
    }

    /**
     * @return array<string, list<string>>
     */
    public function notesByLayer(): array
    {
        $layers = array_fill_keys(array_map(fn (NoteLayer $l) => $l->value, NoteLayer::cases()), []);

        foreach ($this->notes as $note) {
            $layers[$note->pivot->layer][] = $note->translated('name');
        }

        return $layers;
    }

    /**
     * Replace the olfactory pyramid. Unknown notes are created on the fly.
     *
     * @param  array<string, list<string>>  $layers
     */
    public function syncNotes(array $layers): void
    {
        $rows = [];

        foreach (NoteLayer::cases() as $layer) {
            foreach (array_values($layers[$layer->value] ?? []) as $position => $name) {
                if (trim((string) $name) === '') {
                    continue;
                }

                $note = Note::findOrCreateByName($name);
                $rows[] = [
                    'product_id' => $this->id,
                    'note_id' => $note->id,
                    'layer' => $layer->value,
                    'sort_order' => $position,
                ];
            }
        }

        $this->notes()->detach();

        // Deduplicate on the unique key in case the same note was typed twice in a layer.
        $unique = collect($rows)->unique(fn ($r) => $r['note_id'].'-'.$r['layer'])->values()->all();
        $this->notes()->newPivotStatement()->insert($unique);
        $this->unsetRelation('notes');
    }
}
