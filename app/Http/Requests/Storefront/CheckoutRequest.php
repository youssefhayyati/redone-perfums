<?php

namespace App\Http\Requests\Storefront;

use App\Enums\PaymentMethod;
use App\Models\City;
use App\Rules\MoroccanPhoneNumber;
use App\Services\Checkout\CheckoutData;
use App\Services\Settings\StoreSettings;
use App\Support\MoroccanPhone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CheckoutRequest extends FormRequest
{
    public function rules(): array
    {
        $emailRequired = app(StoreSettings::class)->bool('checkout.email_required');

        return [
            'customer_name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'string', 'max:24', new MoroccanPhoneNumber],
            'email' => [$emailRequired ? 'required' : 'nullable', 'email:rfc', 'max:190'],
            'city_id' => ['required', 'integer', Rule::exists('cities', 'id')->where('is_active', true)],
            'address' => ['required', 'string', 'min:8', 'max:500'],
            'delivery_notes' => ['nullable', 'string', 'max:500'],
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
        ];
    }

    public function toData(): CheckoutData
    {
        $city = City::query()->with('zone')->findOrFail($this->integer('city_id'));

        return new CheckoutData(
            customerName: trim($this->string('customer_name')),
            phone: MoroccanPhone::normalize($this->string('phone')),
            email: $this->filled('email') ? mb_strtolower(trim($this->string('email'))) : null,
            city: $city,
            address: trim($this->string('address')),
            deliveryNotes: $this->filled('delivery_notes') ? trim($this->string('delivery_notes')) : null,
            paymentMethod: $this->enum('payment_method', PaymentMethod::class),
        );
    }
}
