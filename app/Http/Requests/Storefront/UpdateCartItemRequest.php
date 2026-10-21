<?php

namespace App\Http\Requests\Storefront;

use App\Services\Cart\CartManager;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCartItemRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'quantity' => ['required_without:selections', 'integer', 'min:1', 'max:'.CartManager::MAX_QUANTITY],
            'selections' => ['required_without:quantity', 'array', 'max:24'],
            'selections.*' => ['integer', 'min:1'],
            'city_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }
}
