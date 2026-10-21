<?php

namespace App\Enums;

enum CartItemType: string
{
    case Product = 'product';
    case Pack = 'pack';
}
