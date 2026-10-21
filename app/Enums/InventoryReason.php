<?php

namespace App\Enums;

enum InventoryReason: string
{
    case Initial = 'initial';
    case Sale = 'sale';
    case Cancellation = 'cancellation';
    case Adjustment = 'adjustment';
    case Restock = 'restock';
}
