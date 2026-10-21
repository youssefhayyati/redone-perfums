<?php

namespace App\Rules;

use App\Support\MoroccanPhone;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class MoroccanPhoneNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! MoroccanPhone::isValid($value)) {
            $fail('Saisissez un numéro marocain valide (ex. 06 12 34 56 78).');
        }
    }
}
