<?php

namespace App\Http\Requests\Storefront;

use App\Rules\MoroccanPhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['nullable', 'string', 'max:24', new MoroccanPhoneNumber],
        ];
    }
}
