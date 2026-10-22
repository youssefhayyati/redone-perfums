<?php

namespace App\Http\Requests\Admin;

use App\Rules\ManagedImagePath;
use Illuminate\Foundation\Http\FormRequest;

class ProcessStepRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'title_ar' => ['nullable', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:1000'],
            'body_ar' => ['nullable', 'string', 'max:1000'],
            'detail' => ['nullable', 'string', 'max:80'],
            'detail_ar' => ['nullable', 'string', 'max:80'],
            'image_path' => ['nullable', 'string', 'max:255', new ManagedImagePath],
            'image_credit' => ['nullable', 'string', 'max:255'],
            'is_visible' => ['boolean'],
        ];
    }
}
