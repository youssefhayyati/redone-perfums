<?php

namespace App\Http\Requests\Admin;

use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProductRequest extends FormRequest
{
    public function rules(): array
    {
        /** @var Product|null $product */
        $product = $this->route('product');
        $productId = $product?->id;

        return [
            'name' => ['required', 'string', 'max:120'],
            'name_ar' => ['nullable', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:140', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('products', 'slug')->ignore($productId)],
            'fragrance_family_id' => ['nullable', 'integer', 'exists:fragrance_families,id'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'tagline_ar' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'description_ar' => ['nullable', 'string', 'max:5000'],
            'inspiration' => ['nullable', 'string', 'max:5000'],
            'inspiration_ar' => ['nullable', 'string', 'max:5000'],
            'concentration' => ['nullable', 'string', 'max:60'],
            'concentration_ar' => ['nullable', 'string', 'max:60'],
            'gender' => ['nullable', Rule::in(Product::GENDERS)],
            'longevity' => ['nullable', 'integer', 'between:1,5'],
            'sillage' => ['nullable', 'integer', 'between:1,5'],
            'status' => ['required', Rule::enum(ProductStatus::class)],
            'is_featured' => ['boolean'],
            'badge' => ['nullable', Rule::in(Product::BADGES)],
            'accent_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_title_ar' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:320'],
            'meta_description_ar' => ['nullable', 'string', 'max:320'],
            'published_at' => ['nullable', 'date'],

            'collection_ids' => ['array'],
            'collection_ids.*' => ['integer', 'exists:collections,id'],

            'notes' => ['array'],
            'notes.top' => ['array', 'max:12'],
            'notes.heart' => ['array', 'max:12'],
            'notes.base' => ['array', 'max:12'],
            'notes.*.*' => ['string', 'max:60'],

            'variants' => ['required', 'array', 'min:1', 'max:12'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.size_ml' => ['required', 'integer', 'between:1,1000'],
            'variants.*.sku' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9\-_.]+$/'],
            // Centimes: 1 DH = 100.
            'variants.*.price' => ['required', 'integer', 'min:0', 'max:10000000'],
            'variants.*.compare_at_price' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'variants.*.stock' => ['required', 'integer', 'min:0', 'max:100000'],
            'variants.*.low_stock_threshold' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'variants.*.is_active' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug') && $this->filled('name')) {
            $this->merge(['slug' => Str::slug((string) $this->input('name'))]);
        }

        if (is_array($this->input('variants'))) {
            $this->merge(['variants' => array_map(
                fn ($v) => is_array($v) && isset($v['sku']) ? [...$v, 'sku' => mb_strtoupper(trim((string) $v['sku']))] : $v,
                $this->input('variants'),
            )]);
        }
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            $variants = collect($this->input('variants', []));
            $product = $this->route('product');

            if ($variants->pluck('size_ml')->duplicates()->isNotEmpty()) {
                $validator->errors()->add('variants', 'Chaque contenance ne peut apparaître qu’une fois.');
            }

            $skus = $variants->pluck('sku')->map(fn ($s) => mb_strtoupper((string) $s));
            if ($skus->duplicates()->isNotEmpty()) {
                $validator->errors()->add('variants', 'Chaque référence (SKU) doit être unique.');
            }

            $ownIds = $product?->variants()->pluck('id')->all() ?? [];
            foreach ($variants as $i => $variant) {
                if (! empty($variant['id']) && ! in_array((int) $variant['id'], $ownIds, true)) {
                    $validator->errors()->add("variants.{$i}.id", 'Variante inconnue.');
                }

                $taken = ProductVariant::query()
                    ->where('sku', $variant['sku'] ?? '')
                    ->when(! empty($variant['id']), fn ($q) => $q->whereKeyNot($variant['id']))
                    ->exists();
                if ($taken) {
                    $validator->errors()->add("variants.{$i}.sku", 'Cette référence est déjà utilisée.');
                }

                if (isset($variant['compare_at_price'], $variant['price']) && $variant['compare_at_price'] !== null && $variant['compare_at_price'] <= $variant['price']) {
                    $validator->errors()->add("variants.{$i}.compare_at_price", 'Le prix barré doit être supérieur au prix.');
                }
            }
        }];
    }
}
