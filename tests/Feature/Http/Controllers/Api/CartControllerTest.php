<?php

namespace Tests\Feature\Http\Controllers\Api;

use App\Enums\CartItemType;
use App\Enums\ProductStatus;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\City;
use App\Models\Coupon;
use App\Models\DeliveryZone;
use App\Models\Pack;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Closure;
use Database\Factories\CouponFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\Sequence;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class CartControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const EMPTY_CART = [
        'token' => null,
        'lines' => [],
        'items_count' => 0,
        'subtotal' => 0,
        'discount_total' => 0,
        'coupon' => null,
        'delivery' => null,
        'total' => null,
        'merchandise_total' => 0,
        'is_checkout_ready' => false,
        'max_quantity' => 10,
    ];

    private const UNKNOWN_TOKEN = '6f1c2b9e-8d4a-4e6b-9c7d-1a2b3c4d5e6f';

    public function test_show_without_a_token_returns_the_empty_cart_shape(): void
    {
        $response = $this->getJson('/api/cart');

        $response->assertOk()
            ->assertExactJson(self::EMPTY_CART);
    }

    #[TestWith(['not-a-uuid'])]
    #[TestWith([self::UNKNOWN_TOKEN])]
    public function test_show_with_an_unknown_token_returns_the_empty_cart_shape(string $token): void
    {
        $response = $this->withHeader('X-Cart-Token', $token)->getJson('/api/cart');

        $response->assertOk()
            ->assertExactJson(self::EMPTY_CART);
    }

    public function test_adding_an_item_without_a_token_creates_a_cart_and_returns_201_with_its_token(): void
    {
        $variant = $this->sellableVariant('Aurore', ['price' => 45000]);

        $response = $this->postJson('/api/cart/items', ['variant_id' => $variant->id, 'quantity' => 2]);

        $response->assertCreated()
            ->assertJsonPath('lines.0.type', 'product')
            ->assertJsonPath('lines.0.quantity', 2)
            ->assertJsonPath('lines.0.unit_price', 45000)
            ->assertJsonPath('lines.0.line_total', 90000)
            ->assertJsonPath('lines.0.product.name', 'Aurore')
            ->assertJsonPath('lines.0.variant.label', '50 ml')
            ->assertJsonPath('items_count', 2)
            ->assertJsonPath('subtotal', 90000)
            ->assertJsonPath('total', null)
            ->assertJsonPath('is_checkout_ready', true);
        $token = $response->json('token');
        $this->assertMatchesRegularExpression('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $token);
        $cart = Cart::query()->where('token', $token)->sole();
        $this->assertDatabaseHas('cart_items', ['cart_id' => $cart->id, 'product_variant_id' => $variant->id, 'quantity' => 2]);
    }

    public function test_adding_an_item_ignores_prices_sent_by_the_client(): void
    {
        $variant = $this->sellableVariant('Aurore', ['price' => 45000]);

        $response = $this->postJson('/api/cart/items', ['variant_id' => $variant->id, 'price' => 100, 'unit_price' => 100]);

        $response->assertCreated()
            ->assertJsonPath('lines.0.unit_price', 45000)
            ->assertJsonPath('subtotal', 45000);
    }

    public function test_adding_the_same_variant_again_increases_the_existing_line(): void
    {
        $variant = $this->sellableVariant();
        $cart = $this->cartContaining($variant, 2);

        $response = $this->withCart($cart)->postJson('/api/cart/items', ['variant_id' => $variant->id, 'quantity' => 3]);

        $response->assertCreated()
            ->assertJsonPath('token', $cart->token)
            ->assertJsonCount(1, 'lines')
            ->assertJsonPath('lines.0.quantity', 5);
        $this->assertDatabaseCount('cart_items', 1);
    }

    public function test_merged_quantity_is_capped_at_ten(): void
    {
        $variant = $this->sellableVariant();
        $cart = $this->cartContaining($variant, 8);

        $response = $this->withCart($cart)->postJson('/api/cart/items', ['variant_id' => $variant->id, 'quantity' => 5]);

        $response->assertCreated()
            ->assertJsonPath('lines.0.quantity', 10);
        $this->assertDatabaseHas('cart_items', ['cart_id' => $cart->id, 'quantity' => 10]);
    }

    public function test_adding_more_than_ten_bottles_at_once_returns_422(): void
    {
        $variant = $this->sellableVariant('Aurore', ['stock' => 50]);

        $response = $this->postJson('/api/cart/items', ['variant_id' => $variant->id, 'quantity' => 11]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity' => 'Le champ quantité ne doit pas être supérieur à 10.']);
        $this->assertDatabaseCount('carts', 0);
    }

    public function test_adding_an_unknown_variant_returns_422(): void
    {
        $response = $this->postJson('/api/cart/items', ['variant_id' => 999]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['variant_id' => 'La valeur choisie pour format n’est pas valide.']);
        $this->assertDatabaseCount('carts', 0);
    }

    public function test_adding_more_than_the_remaining_stock_returns_422_with_the_quantity_left(): void
    {
        $variant = $this->sellableVariant('Aurore', ['stock' => 3]);

        $response = $this->postJson('/api/cart/items', ['variant_id' => $variant->id, 'quantity' => 4]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity' => 'Aurore 50 ml : il n’en reste que 3.']);
        $this->assertDatabaseCount('carts', 0);
    }

    public function test_adding_a_sold_out_variant_returns_422(): void
    {
        $variant = ProductVariant::factory()->outOfStock()
            ->for(Product::factory()->published()->named('Aurore'))
            ->create(['size_ml' => 100]);

        $response = $this->postJson('/api/cart/items', ['variant_id' => $variant->id]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity' => 'Aurore 100 ml est en rupture de stock.']);
        $this->assertDatabaseCount('carts', 0);
    }

    /**
     * @return array<string, array{Closure(): ProductVariant}>
     */
    public static function variantsNotForSale(): array
    {
        return [
            'draft product' => [fn () => ProductVariant::factory()->for(Product::factory()->draft())->create()],
            'archived product' => [fn () => ProductVariant::factory()->for(Product::factory()->archived())->create()],
            'scheduled product' => [fn () => ProductVariant::factory()->for(Product::factory()->scheduled())->create()],
            'soft-deleted product' => [fn () => ProductVariant::factory()->for(Product::factory()->published()->trashed())->create()],
            'inactive variant' => [fn () => ProductVariant::factory()->inactive()->for(Product::factory()->published())->create()],
        ];
    }

    /**
     * @param  Closure(): ProductVariant  $makeVariant
     */
    #[DataProvider('variantsNotForSale')]
    public function test_adding_a_variant_that_is_not_for_sale_returns_422(Closure $makeVariant): void
    {
        $variant = $makeVariant();

        $response = $this->postJson('/api/cart/items', ['variant_id' => $variant->id]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['variant_id' => 'Ce format n’est pas disponible.']);
        $this->assertDatabaseCount('carts', 0);
    }

    public function test_adding_a_custom_pack_creates_a_line_priced_by_the_pack(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit', ['price' => 45000]);
        $oud = $this->sellableVariant('Oud Royal', ['price' => 38000]);
        $cedar = $this->sellableVariant('Cèdre Blanc', ['price' => 52000]);
        $pack = Pack::factory()->custom(3)->fixedPrice(120000)->named('Trio Libre')->create();

        $response = $this->postJson('/api/cart/packs', [
            'pack_id' => $pack->id,
            'selections' => [$cedar->id, $amber->id, $oud->id],
            'price' => 100,
        ]);

        $response->assertCreated()
            ->assertJsonPath('lines.0.type', 'pack')
            ->assertJsonPath('lines.0.pack.name', 'Trio Libre')
            ->assertJsonPath('lines.0.pack.editable', true)
            ->assertJsonPath('lines.0.unit_price', 120000)
            ->assertJsonPath('lines.0.compare_at_price', 135000)
            ->assertJsonPath('lines.0.selections.*.product_name', ['Cèdre Blanc', 'Ambre Nuit', 'Oud Royal'])
            ->assertJsonPath('lines.0.raw_selections', [$cedar->id, $amber->id, $oud->id])
            ->assertJsonPath('subtotal', 120000);
        $line = CartItem::query()->sole();
        $this->assertSame([CartItemType::Pack, $pack->id, 1], [$line->type, $line->pack_id, $line->quantity]);
        $this->assertSame([$cedar->id, $amber->id, $oud->id], $line->selections);
    }

    public function test_adding_the_same_pack_composition_in_another_order_merges_into_quantity_two(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit');
        $oud = $this->sellableVariant('Oud Royal');
        $pack = Pack::factory()->custom(2)->create();
        $cart = Cart::create(['token' => (string) Str::uuid()]);
        $cart->items()->create([
            'type' => CartItemType::Pack, 'pack_id' => $pack->id, 'selections' => [$amber->id, $oud->id], 'quantity' => 1,
        ]);

        $response = $this->withCart($cart)->postJson('/api/cart/packs', ['pack_id' => $pack->id, 'selections' => [$oud->id, $amber->id]]);

        $response->assertCreated()
            ->assertJsonCount(1, 'lines')
            ->assertJsonPath('lines.0.quantity', 2);
        $this->assertDatabaseCount('cart_items', 1);
    }

    public function test_adding_a_fixed_pack_lists_each_of_its_bottles(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit');
        $oud = $this->sellableVariant('Oud Royal');
        $pack = Pack::factory()->fixed()->fixedPrice(110000)->containing($amber, 2)->containing($oud)->create();

        $response = $this->postJson('/api/cart/packs', ['pack_id' => $pack->id]);

        $response->assertCreated()
            ->assertJsonPath('lines.0.pack.editable', false)
            ->assertJsonPath('lines.0.unit_price', 110000)
            ->assertJsonPath('lines.0.selections.*.product_name', ['Ambre Nuit', 'Ambre Nuit', 'Oud Royal'])
            ->assertJsonPath('lines.0.raw_selections', null);
        $this->assertDatabaseHas('cart_items', ['type' => 'pack', 'pack_id' => $pack->id, 'selections' => null, 'quantity' => 1]);
    }

    public function test_adding_a_pack_with_the_wrong_number_of_perfumes_returns_422(): void
    {
        $pack = Pack::factory()->custom(3)->create();

        $response = $this->postJson('/api/cart/packs', ['pack_id' => $pack->id, 'selections' => [$this->sellableVariant()->id]]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['selections' => 'Ce coffret se compose de 3 parfums : vous en avez choisi 1.']);
        $this->assertDatabaseCount('carts', 0);
    }

    public function test_adding_a_pack_that_is_no_longer_offered_returns_422(): void
    {
        $pack = Pack::factory()->custom(1)->inactive()->create();

        $response = $this->postJson('/api/cart/packs', ['pack_id' => $pack->id, 'selections' => [$this->sellableVariant()->id]]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['selections' => 'Ce coffret n’est plus proposé.']);
        $this->assertDatabaseCount('carts', 0);
    }

    public function test_updating_a_line_quantity_replaces_it(): void
    {
        $cart = $this->cartContaining($this->sellableVariant(), 1);
        $line = $cart->items()->sole();

        $response = $this->withCart($cart)->patchJson("/api/cart/items/{$line->id}", ['quantity' => 4]);

        $response->assertOk()
            ->assertJsonPath('lines.0.quantity', 4);
        $this->assertSame(4, $line->fresh()->quantity);
    }

    public function test_updating_a_line_beyond_the_remaining_stock_returns_422_and_keeps_the_quantity(): void
    {
        $cart = $this->cartContaining($this->sellableVariant('Aurore', ['stock' => 3]), 1);
        $line = $cart->items()->sole();

        $response = $this->withCart($cart)->patchJson("/api/cart/items/{$line->id}", ['quantity' => 5]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity' => 'Aurore 50 ml : il n’en reste que 3.']);
        $this->assertSame(1, $line->fresh()->quantity);
    }

    public function test_replacing_the_perfumes_of_a_custom_pack_line_reprices_it(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit', ['price' => 45000]);
        $oud = $this->sellableVariant('Oud Royal', ['price' => 38000]);
        $cedar = $this->sellableVariant('Cèdre Blanc', ['price' => 52000]);
        $pack = Pack::factory()->custom(2)->amountOff(10000)->create();
        $cart = Cart::create(['token' => (string) Str::uuid()]);
        $line = $cart->items()->create([
            'type' => CartItemType::Pack, 'pack_id' => $pack->id, 'selections' => [$amber->id, $oud->id], 'quantity' => 1,
        ]);

        $response = $this->withCart($cart)->patchJson("/api/cart/items/{$line->id}", ['selections' => [$amber->id, $cedar->id]]);

        $response->assertOk()
            ->assertJsonPath('lines.0.raw_selections', [$amber->id, $cedar->id])
            ->assertJsonPath('lines.0.unit_price', 87000);
        $this->assertSame([$amber->id, $cedar->id], $line->fresh()->selections);
    }

    public function test_replacing_selections_of_a_single_bottle_line_returns_422(): void
    {
        $cart = $this->cartContaining($this->sellableVariant());
        $line = $cart->items()->sole();

        $response = $this->withCart($cart)->patchJson("/api/cart/items/{$line->id}", ['selections' => [$this->sellableVariant()->id]]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['selections' => 'Cet article ne se compose pas.']);
    }

    public function test_removing_a_line_deletes_it(): void
    {
        $cart = $this->cartContaining($this->sellableVariant('Aurore'));
        $removed = $cart->items()->create([
            'type' => CartItemType::Product, 'product_variant_id' => $this->sellableVariant('Oud Royal')->id, 'quantity' => 1,
        ]);

        $response = $this->withCart($cart)->deleteJson("/api/cart/items/{$removed->id}");

        $response->assertOk()
            ->assertJsonPath('lines.*.product.name', ['Aurore']);
        $this->assertModelMissing($removed);
    }

    /**
     * @return array<string, array{string, array<string, int>}>
     */
    public static function lineMutations(): array
    {
        return [
            'update' => ['patch', ['quantity' => 2]],
            'remove' => ['delete', []],
        ];
    }

    /**
     * @param  array<string, int>  $payload
     */
    #[DataProvider('lineMutations')]
    public function test_a_line_of_another_cart_returns_404(string $method, array $payload): void
    {
        $mine = $this->cartContaining($this->sellableVariant('Aurore'));
        $theirLine = $this->cartContaining($this->sellableVariant('Oud Royal'), 1)->items()->sole();

        $response = $this->withCart($mine)->json($method, "/api/cart/items/{$theirLine->id}", $payload);

        $response->assertNotFound();
        $this->assertDatabaseHas('cart_items', ['id' => $theirLine->id, 'quantity' => 1]);
    }

    /**
     * @return array<string, array{string, string, array<string, mixed>}>
     */
    public static function mutationsRequiringACart(): array
    {
        return [
            'update a line' => ['patch', '/api/cart/items/1', ['quantity' => 2]],
            'remove a line' => ['delete', '/api/cart/items/1', []],
            'apply a coupon' => ['post', '/api/cart/coupon', ['code' => 'BIENVENUE']],
            'remove the coupon' => ['delete', '/api/cart/coupon', []],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    #[DataProvider('mutationsRequiringACart')]
    public function test_changing_a_cart_that_does_not_exist_returns_404(string $method, string $uri, array $payload): void
    {
        $response = $this->withHeader('X-Cart-Token', self::UNKNOWN_TOKEN)->json($method, $uri, $payload);

        $response->assertNotFound()
            ->assertJsonPath('message', 'Panier introuvable.');
    }

    public function test_applying_an_unknown_coupon_returns_422(): void
    {
        $cart = $this->cartContaining($this->sellableVariant());

        $response = $this->withCart($cart)->postJson('/api/cart/coupon', ['code' => 'INCONNU']);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'Ce code n’existe pas.']);
        $this->assertNull($cart->fresh()->coupon_id);
    }

    /**
     * @return array<string, array{Closure(CouponFactory): CouponFactory, string}>
     */
    public static function unusableCoupons(): array
    {
        return [
            'inactive' => [fn (CouponFactory $coupon) => $coupon->inactive(), 'Ce code n’est pas actif.'],
            'not yet valid' => [fn (CouponFactory $coupon) => $coupon->notYetValid(), 'Ce code n’est pas encore valable.'],
            'expired' => [fn (CouponFactory $coupon) => $coupon->expired(), 'Ce code a expiré.'],
            'usage limit reached' => [fn (CouponFactory $coupon) => $coupon->exhausted(), 'Ce code a atteint sa limite d’utilisation.'],
            'minimum not reached' => [fn (CouponFactory $coupon) => $coupon->minimumSubtotal(50000), 'Le montant minimum pour ce code n’est pas atteint.'],
        ];
    }

    /**
     * @param  Closure(CouponFactory): CouponFactory  $state
     */
    #[DataProvider('unusableCoupons')]
    public function test_applying_an_unusable_coupon_returns_422_with_the_reason(Closure $state, string $message): void
    {
        $this->freezeTime();
        $cart = $this->cartContaining($this->sellableVariant('Aurore', ['price' => 45000]));
        $state(Coupon::factory())->create(['code' => 'BIENVENUE']);

        $response = $this->withCart($cart)->postJson('/api/cart/coupon', ['code' => 'BIENVENUE']);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => $message]);
        $this->assertNull($cart->fresh()->coupon_id);
    }

    public function test_applying_a_valid_coupon_ignores_case_and_shows_the_discount(): void
    {
        $cart = $this->cartContaining($this->sellableVariant('Aurore', ['price' => 45000]), 2);
        $coupon = Coupon::factory()->percent(10)->create(['code' => 'BIENVENUE10']);

        $response = $this->withCart($cart)->postJson('/api/cart/coupon', ['code' => ' bienvenue10 ']);

        $response->assertOk()
            ->assertJsonPath('coupon', ['code' => 'BIENVENUE10', 'discount' => 9000, 'error' => null])
            ->assertJsonPath('discount_total', 9000)
            ->assertJsonPath('merchandise_total', 81000);
        $this->assertSame($coupon->id, $cart->fresh()->coupon_id);
    }

    public function test_a_fixed_coupon_never_discounts_more_than_the_subtotal(): void
    {
        $cart = $this->cartContaining($this->sellableVariant('Aurore', ['price' => 45000]));
        Coupon::factory()->fixed(100000)->create(['code' => 'CADEAU']);

        $response = $this->withCart($cart)->postJson('/api/cart/coupon', ['code' => 'CADEAU']);

        $response->assertOk()
            ->assertJsonPath('discount_total', 45000)
            ->assertJsonPath('merchandise_total', 0);
    }

    public function test_removing_the_coupon_clears_the_discount(): void
    {
        $cart = $this->cartContaining($this->sellableVariant('Aurore', ['price' => 45000]));
        $cart->coupon()->associate(Coupon::factory()->percent(10)->create())->save();

        $response = $this->withCart($cart)->deleteJson('/api/cart/coupon');

        $response->assertOk()
            ->assertJsonPath('coupon', null)
            ->assertJsonPath('discount_total', 0);
        $this->assertNull($cart->fresh()->coupon_id);
    }

    public function test_city_adds_its_zone_fee_and_reports_what_remains_for_free_shipping(): void
    {
        $zone = DeliveryZone::factory()->freeShippingFrom(100000)->create(['fee' => 3000, 'delivery_estimate' => '24 à 48 h']);
        $city = City::factory()->for($zone, 'zone')->named('Casablanca')->create();
        $cart = $this->cartContaining($this->sellableVariant('Aurore', ['price' => 45000]));

        $response = $this->withCart($cart)->getJson("/api/cart?city_id={$city->id}");

        $response->assertOk()
            ->assertJsonPath('delivery', [
                'city_id' => $city->id,
                'city' => 'Casablanca',
                'fee' => 3000,
                'free_shipping_threshold' => 100000,
                'remaining_for_free_shipping' => 55000,
                'estimate' => '24 à 48 h',
                'error' => null,
            ])
            ->assertJsonPath('total', 48000);
    }

    public function test_delivery_is_free_once_the_merchandise_total_reaches_the_threshold(): void
    {
        $city = City::factory()->for(DeliveryZone::factory()->freeShippingFrom(100000), 'zone')->create();
        $cart = $this->cartContaining($this->sellableVariant('Aurore', ['price' => 60000]), 2);

        $response = $this->withCart($cart)->getJson("/api/cart?city_id={$city->id}");

        $response->assertOk()
            ->assertJsonPath('delivery.fee', 0)
            ->assertJsonPath('delivery.remaining_for_free_shipping', null)
            ->assertJsonPath('total', 120000);
    }

    public function test_free_shipping_threshold_is_measured_after_the_coupon_discount(): void
    {
        $city = City::factory()->for(DeliveryZone::factory()->freeShippingFrom(100000), 'zone')->create();
        $cart = $this->cartContaining($this->sellableVariant('Aurore', ['price' => 105000]));
        $cart->coupon()->associate(Coupon::factory()->percent(10)->create())->save();

        $response = $this->withCart($cart)->getJson("/api/cart?city_id={$city->id}");

        $response->assertOk()
            ->assertJsonPath('merchandise_total', 94500)
            ->assertJsonPath('delivery.fee', 3000)
            ->assertJsonPath('delivery.remaining_for_free_shipping', 5500)
            ->assertJsonPath('total', 97500);
    }

    /**
     * @return array<string, array{Closure(): City}>
     */
    public static function undeliverableCities(): array
    {
        return [
            'inactive city' => [fn () => City::factory()->inactive()->create()],
            'city of an inactive zone' => [fn () => City::factory()->for(DeliveryZone::factory()->inactive(), 'zone')->create()],
            'city without zone' => [fn () => City::factory()->withoutZone()->create()],
        ];
    }

    /**
     * @param  Closure(): City  $makeCity
     */
    #[DataProvider('undeliverableCities')]
    public function test_undeliverable_city_reports_an_error_and_no_total(Closure $makeCity): void
    {
        $city = $makeCity();
        $cart = $this->cartContaining($this->sellableVariant());

        $response = $this->withCart($cart)->getJson("/api/cart?city_id={$city->id}");

        $response->assertOk()
            ->assertJsonPath('delivery.fee', null)
            ->assertJsonPath('delivery.error', 'La livraison n’est pas disponible pour cette ville.')
            ->assertJsonPath('total', null);
    }

    public function test_mutations_price_delivery_for_the_city_sent_in_the_body(): void
    {
        $city = City::factory()->for(DeliveryZone::factory()->state(['fee' => 3500]), 'zone')->create();
        $variant = $this->sellableVariant('Aurore', ['price' => 45000]);

        $response = $this->postJson('/api/cart/items', ['variant_id' => $variant->id, 'city_id' => $city->id]);

        $response->assertCreated()
            ->assertJsonPath('delivery.fee', 3500)
            ->assertJsonPath('total', 48500);
    }

    public function test_adding_a_31st_line_returns_422(): void
    {
        [$cart, $variants] = $this->cartWithThirtyLines();

        $response = $this->withCart($cart)->postJson('/api/cart/items', ['variant_id' => $variants[30]->id]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['cart' => 'Votre panier a atteint le nombre maximum d’articles.']);
        $this->assertDatabaseCount('cart_items', 30);
        $this->assertModelExists($cart);
    }

    public function test_a_full_cart_still_accepts_more_of_an_existing_line(): void
    {
        [$cart, $variants] = $this->cartWithThirtyLines();

        $response = $this->withCart($cart)->postJson('/api/cart/items', ['variant_id' => $variants[0]->id]);

        $response->assertCreated()
            ->assertJsonPath('lines.0.quantity', 2);
        $this->assertDatabaseCount('cart_items', 30);
    }

    public function test_a_line_whose_product_was_unpublished_is_flagged_and_blocks_checkout(): void
    {
        $cart = $this->cartContaining($this->sellableVariant('Aurore', ['price' => 45000]));
        $withdrawn = $this->sellableVariant('Oud Royal', ['price' => 38000]);
        $cart->items()->create(['type' => CartItemType::Product, 'product_variant_id' => $withdrawn->id, 'quantity' => 1]);
        $withdrawn->product->update(['status' => ProductStatus::Draft]);

        $response = $this->withCart($cart)->getJson('/api/cart');

        $response->assertOk()
            ->assertJsonPath('lines.1.product.name', 'Oud Royal')
            ->assertJsonPath('lines.1.issues', [['code' => 'unavailable', 'message' => 'Un article de votre panier n’est plus disponible.']])
            ->assertJsonPath('lines.1.unit_price', null)
            ->assertJsonPath('lines.1.line_total', 0)
            ->assertJsonPath('subtotal', 45000)
            ->assertJsonPath('is_checkout_ready', false);
    }

    public function test_a_line_exceeding_the_current_stock_is_flagged_and_blocks_checkout(): void
    {
        $variant = $this->sellableVariant('Aurore', ['stock' => 5]);
        $cart = $this->cartContaining($variant, 3);
        $variant->forceFill(['stock' => 2])->save();

        $response = $this->withCart($cart)->getJson('/api/cart');

        $response->assertOk()
            ->assertJsonPath('lines.0.issues', [['code' => 'insufficient_stock', 'message' => 'Aurore 50 ml : il n’en reste que 2.']])
            ->assertJsonPath('lines.0.unit_price', 45000)
            ->assertJsonPath('is_checkout_ready', false);
    }

    public function test_adding_a_pack_beyond_the_stock_shared_with_single_bottles_returns_422(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit', ['stock' => 2]);
        $oud = $this->sellableVariant('Oud Royal');
        $pack = Pack::factory()->custom(2)->create();
        $cart = $this->cartContaining($amber, 1);
        $packLine = $cart->items()->create([
            'type' => CartItemType::Pack, 'pack_id' => $pack->id, 'selections' => [$amber->id, $oud->id], 'quantity' => 1,
        ]);

        $response = $this->withCart($cart)->postJson('/api/cart/packs', ['pack_id' => $pack->id, 'selections' => [$oud->id, $amber->id]]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity' => 'Ambre Nuit 50 ml : il n’en reste que 2.']);
        $this->assertSame(1, $packLine->fresh()->quantity);
    }

    public function test_a_signed_in_customer_cart_is_linked_to_the_account(): void
    {
        $customer = User::factory()->customer()->create();
        $variant = $this->sellableVariant();

        $response = $this->actingAs($customer)->postJson('/api/cart/items', ['variant_id' => $variant->id]);

        $response->assertCreated();
        $this->assertDatabaseHas('carts', ['token' => $response->json('token'), 'user_id' => $customer->id]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function sellableVariant(string $productName = 'Aurore', array $attributes = []): ProductVariant
    {
        return ProductVariant::factory()
            ->for(Product::factory()->published()->state(['name' => $productName]))
            ->create($attributes);
    }

    private function cartContaining(ProductVariant $variant, int $quantity = 1): Cart
    {
        $cart = Cart::create(['token' => (string) Str::uuid()]);
        $cart->items()->create(['type' => CartItemType::Product, 'product_variant_id' => $variant->id, 'quantity' => $quantity]);

        return $cart;
    }

    /**
     * @return array{Cart, Collection<int, ProductVariant>}
     */
    private function cartWithThirtyLines(): array
    {
        $variants = ProductVariant::factory()->count(31)
            ->for(Product::factory()->published())
            ->sequence(fn (Sequence $sequence) => ['size_ml' => 10 + $sequence->index])
            ->create();
        $cart = Cart::create(['token' => (string) Str::uuid()]);
        $cart->items()->createMany($variants->take(30)->map(fn (ProductVariant $variant) => [
            'type' => CartItemType::Product, 'product_variant_id' => $variant->id, 'quantity' => 1,
        ])->all());

        return [$cart, $variants];
    }

    private function withCart(Cart $cart): static
    {
        return $this->withHeader('X-Cart-Token', $cart->token);
    }
}
