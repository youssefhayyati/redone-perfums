<?php

namespace Tests\Feature\Console\Commands;

use App\Models\Cart;
use App\Models\Collection;
use App\Models\Note;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Pack;
use App\Models\ProcessStep;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\Settings\StoreSettings;
use Database\Seeders\DemoCatalogSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class RemoveDemoContentTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_removes_the_demo_catalogue_and_keeps_the_real_one(): void
    {
        $this->seed(DemoCatalogSeeder::class);
        $real = Product::factory()->create(['name' => 'Ambre Royal']);
        $real->notes()->attach(Note::findOrCreateByName('Ciste'), ['layer' => 'base']);
        $realCollection = Collection::factory()->create();
        ProcessStep::factory()->demo()->create();
        $ownStep = ProcessStep::factory()->create(['image_path' => 'uploads/lab/abc123.webp']);

        $this->artisan('app:remove-demo-content', ['--force' => true])->assertSuccessful();

        $this->assertSame([$real->id], Product::withTrashed()->pluck('id')->all());
        $this->assertSame([$realCollection->id], Collection::query()->pluck('id')->all());
        $this->assertSame(0, Pack::query()->count());
        $this->assertSame(['Ciste'], Note::query()->pluck('name')->all());
        $this->assertSame([$ownStep->id], ProcessStep::query()->pluck('id')->all());
        $this->assertSame(0, ProductVariant::query()->whereNotIn('product_id', [$real->id])->count());
    }

    public function test_past_orders_keep_their_lines_unless_orders_are_removed_too(): void
    {
        $this->seed(DemoCatalogSeeder::class);
        $order = Order::factory()->withItem(Product::query()->where('is_demo', true)->first()->variants()->first(), 1)->create();

        $this->artisan('app:remove-demo-content', ['--force' => true])->assertSuccessful();

        $line = OrderItem::query()->where('order_id', $order->id)->sole();
        $this->assertNull($line->product_variant_id);
        $this->assertNotSame('', $line->name);

        Cart::create(['token' => (string) Str::uuid()]);
        $this->artisan('app:remove-demo-content', ['--orders' => true, '--force' => true])->assertSuccessful();

        $this->assertSame(0, Order::query()->count());
        $this->assertSame(0, Cart::query()->count());
    }

    public function test_switches_off_the_announcement_while_it_still_says_the_catalogue_is_fictional(): void
    {
        $this->seed(DemoCatalogSeeder::class);

        $this->artisan('app:remove-demo-content', ['--force' => true])->assertSuccessful();

        $this->assertFalse(app(StoreSettings::class)->bool('announcement.enabled'));
    }

    public function test_keeps_an_announcement_the_store_wrote_itself(): void
    {
        $this->seed(DemoCatalogSeeder::class);
        app(StoreSettings::class)->put(['announcement.text' => 'Livraison offerte dès 500 DH']);

        $this->artisan('app:remove-demo-content', ['--force' => true])->assertSuccessful();

        $this->assertTrue(app(StoreSettings::class)->bool('announcement.enabled'));
    }

    public function test_deletes_nothing_when_the_confirmation_is_declined(): void
    {
        $this->seed(DemoCatalogSeeder::class);
        $products = Product::query()->count();

        $this->artisan('app:remove-demo-content')
            ->expectsConfirmation('Supprimer définitivement ce contenu ?', 'no')
            ->assertFailed();

        $this->assertSame($products, Product::query()->count());
    }
}
