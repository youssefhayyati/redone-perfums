<?php

namespace Tests\Feature\Console\Commands;

use App\Models\Cart;
use App\Models\Order;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PruneCartsTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_deletes_only_carts_untouched_for_more_than_45_days(): void
    {
        $this->travelTo('2026-10-21 03:00:00');
        $abandoned = $this->cartLastTouched(now()->subDays(46));
        $converted = $this->cartLastTouched(now()->subDays(60), convertedAt: now()->subDays(60));
        $order = Order::factory()->create(['cart_id' => $converted->id]);
        $recent = $this->cartLastTouched(now()->subDays(44));

        $this->artisan('app:prune-carts')
            ->expectsOutput('2 panier(s) supprimé(s).')
            ->assertSuccessful();

        $this->assertModelMissing($abandoned);
        $this->assertModelMissing($converted);
        $this->assertModelExists($recent);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'cart_id' => null]);
    }

    public function test_honours_a_custom_retention_period(): void
    {
        $this->travelTo('2026-10-21 03:00:00');
        $older = $this->cartLastTouched(now()->subDays(8));
        $newer = $this->cartLastTouched(now()->subDays(6));

        $this->artisan('app:prune-carts', ['--days' => 7])
            ->expectsOutput('1 panier(s) supprimé(s).')
            ->assertSuccessful();

        $this->assertModelMissing($older);
        $this->assertModelExists($newer);
    }

    private function cartLastTouched(mixed $updatedAt, mixed $convertedAt = null): Cart
    {
        return Cart::create([
            'token' => (string) Str::uuid(),
            'converted_at' => $convertedAt,
            'created_at' => $updatedAt,
            'updated_at' => $updatedAt,
        ]);
    }
}
