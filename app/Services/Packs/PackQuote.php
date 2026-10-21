<?php

namespace App\Services\Packs;

use App\Models\ProductVariant;

final readonly class PackQuote
{
    /**
     * @param  list<ProductVariant>  $variants  ordered selection (one entry per bottle)
     */
    public function __construct(
        public array $variants,
        public int $compareAt,
        public int $price,
    ) {}

    public function savings(): int
    {
        return max(0, $this->compareAt - $this->price);
    }
}
