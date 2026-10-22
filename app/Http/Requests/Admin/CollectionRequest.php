<?php

namespace App\Http\Requests\Admin;

use App\Rules\ManagedImagePath;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CollectionRequest extends FormRequest
{
    public function rules(): array
    {
        $id = $this->route('collection')?->id;

        return [
            'name' => ['required', 'string', 'max:120'],
            'name_ar' => ['nullable', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:140', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('collections', 'slug')->ignore($id)],
            'tagline' => ['nullable', 'string', 'max:255'],
            'tagline_ar' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'description_ar' => ['nullable', 'string', 'max:3000'],
            'image_path' => ['nullable', 'string', 'max:255', new ManagedImagePath],
            'accent_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'is_visible' => ['boolean'],
            'is_featured' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'product_ids' => ['array'],
            'product_ids.*' => ['integer', 'distinct', 'exists:products,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug') && $this->filled('name')) {
            $this->merge(['slug' => Str::slug((string) $this->input('name'))]);
        }
    }
}
