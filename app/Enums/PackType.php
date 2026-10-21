<?php

namespace App\Enums;

enum PackType: string
{
    /** The customer composes the pack from eligible variants. */
    case Custom = 'custom';

    /** The contents are defined by the store (pack_items). */
    case Fixed = 'fixed';
}
