<?php

namespace App\Console\Commands;

use App\Models\Cart;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:prune-carts {--days=45 : Delete carts untouched for this many days}')]
#[Description('Delete abandoned and converted carts')]
class PruneCarts extends Command
{
    public function handle(): int
    {
        $cutoff = now()->subDays(max(1, (int) $this->option('days')));

        $deleted = Cart::query()->where('updated_at', '<', $cutoff)->delete();

        $this->info("{$deleted} panier(s) supprimé(s).");

        return self::SUCCESS;
    }
}
