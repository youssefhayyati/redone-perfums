<?php

namespace App\Http\Requests\Admin;

use App\Enums\PackEligibility;
use App\Enums\PackPricing;
use App\Enums\PackType;
use App\Rules\ManagedImagePath;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class PackRequest extends FormRequest
{
    public function rules(): array
    {
        $id = $this->route('pack')?->id;
        $custom = $this->input('type') === PackType::Custom->value;
        $pricing = $this->input('pricing_type');

        return [
            'name' => ['required', 'string', 'max:120'],
            'name_ar' => ['nullable', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:140', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('packs', 'slug')->ignore($id)],
            'type' => ['required', Rule::enum(PackType::class)],
            'tagline' => ['nullable', 'string', 'max:255'],
            'tagline_ar' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'description_ar' => ['nullable', 'string', 'max:3000'],
            'image_path' => ['nullable', 'string', 'max:255', new ManagedImagePath],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],

            'pricing_type' => ['required', Rule::enum(PackPricing::class)],
            'price' => [Rule::requiredIf($pricing === PackPricing::Fixed->value), 'nullable', 'integer', 'min:0', 'max:10000000'],
            'discount_value' => [
                Rule::requiredIf(in_array($pricing, [PackPricing::Percent->value, PackPricing::Amount->value], true)),
                'nullable', 'integer', 'min:1',
                $pricing === PackPricing::Percent->value ? 'max:90' : 'max:10000000',
            ],

            // Custom packs
            'selection_count' => [Rule::requiredIf($custom), 'nullable', 'integer', 'between:2,12'],
            'allowed_sizes' => ['nullable', 'array', 'max:10'],
            'allowed_sizes.*' => ['integer', 'between:1,1000'],
            'eligibility' => [Rule::requiredIf($custom), 'nullable', Rule::enum(PackEligibility::class)],
            'allow_duplicates' => ['boolean'],
            'collection_ids' => ['array'],
            'collection_ids.*' => ['integer', 'exists:collections,id'],
            'product_ids' => ['array'],
            'product_ids.*' => ['integer', 'exists:products,id'],

            // Fixed packs
            'items' => [Rule::requiredIf(! $custom), 'array', 'max:12'],
            'items.*.variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'between:1,6'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug') && $this->filled('name')) {
            $this->merge(['slug' => Str::slug((string) $this->input('name'))]);
        }
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($this->input('type') === PackType::Custom->value) {
                $eligibility = $this->input('eligibility');
                if ($eligibility === PackEligibility::Collections->value && empty($this->input('collection_ids'))) {
                    $validator->errors()->add('collection_ids', 'Choisissez au moins une collection.');
                }
                if ($eligibility === PackEligibility::Products->value && count($this->input('product_ids', [])) < (int) $this->input('selection_count')
                    && ! $this->boolean('allow_duplicates')) {
                    $validator->errors()->add('product_ids', 'Sélectionnez au moins autant de parfums que de flacons à composer.');
                }
            }

            if ($this->input('type') === PackType::Fixed->value) {
                $bottles = collect($this->input('items', []))->sum('quantity');
                if ($bottles < 2) {
                    $validator->errors()->add('items', 'Un coffret fixe contient au moins deux flacons.');
                }
            }
        }];
    }
}
