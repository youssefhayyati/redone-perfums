<?php

namespace App\Enums;

enum PackPricing: string
{
    /** The pack costs `price`, whatever the selection. */
    case Fixed = 'fixed';

    /** `discount_value` percent off the sum of the selected variants. */
    case Percent = 'percent';

    /** `discount_value` centimes off the sum of the selected variants. */
    case Amount = 'amount';
}
