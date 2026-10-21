<?php

namespace App\Http\Requests\Storefront;

use App\Services\Cart\CartManager;
use Illuminate\Foundation\Http\FormRequest;

class AddCartItemRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:'.CartManager::MAX_QUANTITY],
            'city_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }
}
