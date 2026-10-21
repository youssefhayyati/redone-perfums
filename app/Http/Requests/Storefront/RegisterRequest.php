<?php

namespace App\Http\Requests\Storefront;

use App\Rules\MoroccanPhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:24', new MoroccanPhoneNumber],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
        }
    }

    public function attributes(): array
    {
        return ['name' => 'nom', 'email' => 'e-mail', 'phone' => 'téléphone', 'password' => 'mot de passe'];
    }
}
