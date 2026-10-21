<?php

namespace App\Enums;

enum PackEligibility: string
{
    case All = 'all';
    case Collections = 'collections';
    case Products = 'products';
}
