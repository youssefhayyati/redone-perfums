<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['slug', 'title', 'body', 'meta_description', 'is_published', 'sort_order'])]
class Page extends Model
{
    protected function casts(): array
    {
        return ['is_published' => 'boolean'];
    }
}
