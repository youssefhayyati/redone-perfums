<?php

namespace App\Http\Requests\Admin;

use App\Enums\CouponType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CouponRequest extends FormRequest
{
    public function rules(): array
    {
        $id = $this->route('coupon')?->id;
        $percent = $this->input('type') === CouponType::Percent->value;

        return [
            'code' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9\-_]+$/', Rule::unique('coupons', 'code')->ignore($id)],
            'description' => ['nullable', 'string', 'max:255'],
            'type' => ['required', Rule::enum(CouponType::class)],
            'value' => ['required', 'integer', 'min:1', $percent ? 'max:90' : 'max:10000000'],
            'min_subtotal' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'max_uses' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge(['code' => mb_strtoupper(trim((string) $this->input('code')))]);
        }
    }
}
