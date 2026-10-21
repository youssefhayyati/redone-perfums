<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['path', 'variants', 'alt', 'width', 'height', 'sort_order'])]
class ProductImage extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'variants' => 'array',
            'width' => 'integer',
            'height' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function url(): ?string
    {
        return MediaUrl::for($this->path);
    }

    /** "url 480w, url 960w" — null when only the original exists. */
    public function srcset(): ?string
    {
        if (empty($this->variants)) {
            return null;
        }

        return collect($this->variants)
            ->map(fn (string $path, string|int $width) => MediaUrl::for($path).' '.$width.'w')
            ->implode(', ');
    }

    /**
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url(),
            'srcset' => $this->srcset(),
            'alt' => $this->alt,
            'width' => $this->width,
            'height' => $this->height,
        ];
    }
}
