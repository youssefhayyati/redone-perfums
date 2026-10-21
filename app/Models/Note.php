<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

#[Fillable(['name', 'slug'])]
class Note extends Model
{
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class)->withPivot(['layer', 'sort_order']);
    }

    public static function findOrCreateByName(string $name): self
    {
        $name = Str::of($name)->squish()->toString();

        return static::firstOrCreate(
            ['slug' => Str::slug($name)],
            ['name' => Str::ucfirst($name)],
        );
    }
}
