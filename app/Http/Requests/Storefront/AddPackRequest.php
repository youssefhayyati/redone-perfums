<?php

namespace App\Http\Requests\Storefront;

use App\Services\Cart\CartManager;
use Illuminate\Foundation\Http\FormRequest;

class AddPackRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'pack_id' => ['required', 'integer', 'exists:packs,id'],
            // Only identifiers are accepted. Whether duplicates are allowed is a pack
            // rule enforced by PackResolver; any price sent by the client is ignored.
            'selections' => ['present', 'array', 'max:24'],
            'selections.*' => ['integer', 'min:1'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:'.CartManager::MAX_QUANTITY],
            'city_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('selections')) {
            $this->merge(['selections' => []]);
        }
    }
}
