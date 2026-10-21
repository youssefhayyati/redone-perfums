<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ImageUploadRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // SVG is intentionally excluded (it can carry scripts).
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192', 'dimensions:min_width=400,min_height=400,max_width=8000,max_height=8000'],
            'alt' => ['nullable', 'string', 'max:160'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.mimes' => 'Formats acceptés : JPG, PNG ou WebP.',
            'image.max' => 'L’image ne doit pas dépasser 8 Mo.',
            'image.dimensions' => 'L’image doit mesurer au moins 400 × 400 px.',
        ];
    }
}
