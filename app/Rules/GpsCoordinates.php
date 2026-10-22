<?php

namespace App\Rules;

use App\Support\GeoPoint;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class GpsCoordinates implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || GeoPoint::parse($value) === null) {
            $fail('Saisissez « latitude, longitude », par exemple 33.5899, -7.6039.');
        }
    }
}
