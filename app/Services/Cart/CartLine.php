<?php

namespace App\Services\Cart;

use App\Enums\CartItemType;
use App\Models\CartItem;
use App\Models\ProductVariant;

final class CartLine
{
    /** @var list<array{code: string, message: string}> */
    public array $issues = [];

    /**
     * @param  list<ProductVariant>  $variants  product line: [variant]; pack line: one entry per bottle
     */
    public function __construct(
        public readonly CartItem $item,
        public readonly int $unitPrice,
        public readonly ?int $compareAtPrice,
        public readonly array $variants,
    ) {}

    public static function unavailable(CartItem $item, string $message): self
    {
        $line = new self($item, 0, null, []);
        $line->addIssue('unavailable', $message);

        return $line;
    }

    public function addIssue(string $code, string $message): void
    {
        $this->issues[] = ['code' => $code, 'message' => $message];
    }

    public function isPriced(): bool
    {
        return ! $this->hasIssue('unavailable');
    }

    public function hasIssue(string $code): bool
    {
        foreach ($this->issues as $issue) {
            if ($issue['code'] === $code) {
                return true;
            }
        }

        return false;
    }

    public function quantity(): int
    {
        return $this->item->quantity;
    }

    public function lineTotal(): int
    {
        return $this->isPriced() ? $this->unitPrice * $this->quantity() : 0;
    }

    public function isPack(): bool
    {
        return $this->item->type === CartItemType::Pack;
    }

    /**
     * Units of each variant this line takes out of stock.
     *
     * @return array<int, int>
     */
    public function demand(): array
    {
        $demand = [];
        foreach ($this->variants as $variant) {
            $demand[$variant->id] = ($demand[$variant->id] ?? 0) + $this->quantity();
        }

        return $demand;
    }
}
