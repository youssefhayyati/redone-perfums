<?php

namespace Tests\Feature\Http\Controllers\Api;

use App\Enums\CartItemType;
use App\Enums\InventoryReason;
use App\Enums\PaymentMethod;
use App\Models\Cart;
use App\Models\City;
use App\Models\Coupon;
use App\Models\DeliveryZone;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Pack;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Notifications\LowStockAlert;
use App\Notifications\NewOrderAlert;
use App\Notifications\OrderConfirmation;
use App\Services\Checkout\CheckoutData;
use App\Services\Checkout\OrderPlacer;
use App\Services\Settings\StoreSettings;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class CheckoutControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_valid_checkout_places_the_order_with_server_computed_totals_and_returns_201(): void
    {
        $this->travelTo('2026-10-21 14:30:00');
        $cart = $this->cartWith([
            [$this->sellableVariant('Ambre Nuit', 45000), 2],
            [$this->sellableVariant('Oud Royal', 38000), 1],
        ]);
        $cart->coupon()->associate(Coupon::factory()->percent(10)->create(['code' => 'BIENVENUE10']))->save();
        $city = City::factory()
            ->for(DeliveryZone::factory()->state(['name' => 'Grand Casablanca', 'fee' => 3000]), 'zone')
            ->named('Casablanca')
            ->create();

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($city, [
            'subtotal' => 100, 'discount_total' => 99999, 'delivery_fee' => 0, 'total' => 100,
        ]));

        $response->assertCreated()
            ->assertJsonPath('order.status', 'pending')
            ->assertJsonPath('order.payment_method', 'cod')
            ->assertJsonPath('order.payment_status', 'unpaid')
            ->assertJsonPath('order.subtotal', 128000)
            ->assertJsonPath('order.discount_total', 12800)
            ->assertJsonPath('order.coupon_code', 'BIENVENUE10')
            ->assertJsonPath('order.delivery_fee', 3000)
            ->assertJsonPath('order.total', 118200)
            ->assertJsonPath('order.items_count', 3)
            ->assertJsonPath('order.phone', '06 12 34 56 78')
            ->assertJsonPath('order.items.*.name', ['Ambre Nuit', 'Oud Royal'])
            ->assertJsonPath('order.items.*.line_total', [90000, 38000]);
        $reference = $response->json('order.reference');
        $this->assertMatchesRegularExpression('/^RP-261021-[A-HJKMNP-Z2-9]{6}$/', $reference);
        $this->assertDatabaseHas('orders', [
            'reference' => $reference,
            'customer_name' => 'Salma Benali',
            'phone' => '+212612345678',
            'email' => 'salma@example.com',
            'city_id' => $city->id,
            'city_name' => 'Casablanca',
            'delivery_zone_name' => 'Grand Casablanca',
            'address' => '12 rue des Orangers, Maârif',
            'delivery_notes' => 'Sonner deux fois',
            'subtotal' => 128000,
            'discount_total' => 12800,
            'delivery_fee' => 3000,
            'total' => 118200,
            'guest_token' => $response->json('access_token'),
            'user_id' => null,
        ]);
    }

    public function test_checkout_decrements_stock_and_records_sale_movements(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit', stock: 10);
        $oud = $this->sellableVariant('Oud Royal', stock: 5);
        $cart = $this->cartWith([[$amber, 2], [$oud, 1]]);

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertCreated();
        $order = Order::query()->sole();
        $this->assertSame(8, $amber->fresh()->stock);
        $this->assertSame(4, $oud->fresh()->stock);
        $this->assertDatabaseCount('inventory_movements', 2);
        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => $amber->id, 'change' => -2, 'stock_after' => 8, 'reason' => 'sale', 'order_id' => $order->id,
        ]);
        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => $oud->id, 'change' => -1, 'stock_after' => 4, 'reason' => 'sale', 'order_id' => $order->id,
        ]);
    }

    public function test_checkout_counts_sales_per_bottle_including_bottles_inside_packs(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit', stock: 10);
        $oud = $this->sellableVariant('Oud Royal', stock: 10);
        $cedar = $this->sellableVariant('Cèdre Blanc', stock: 10);
        $pack = Pack::factory()->custom(3)->create();
        $cart = $this->cartWith([[$amber, 2]]);
        $cart->items()->create([
            'type' => CartItemType::Pack, 'pack_id' => $pack->id, 'selections' => [$amber->id, $oud->id, $cedar->id], 'quantity' => 1,
        ]);

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertCreated();
        $this->assertSame(3, $amber->product->fresh()->sales_count);
        $this->assertSame(1, $oud->product->fresh()->sales_count);
        $this->assertSame(1, $cedar->product->fresh()->sales_count);
        $this->assertSame(7, $amber->fresh()->stock);
    }

    public function test_checkout_snapshots_the_perfumes_of_a_pack_line(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit', 45000);
        $oud = $this->sellableVariant('Oud Royal', 38000);
        $pack = Pack::factory()->custom(2)->percentOff(10)->named('Duo du Soir')->create();
        $cart = Cart::create(['token' => (string) Str::uuid()]);
        $cart->items()->create([
            'type' => CartItemType::Pack, 'pack_id' => $pack->id, 'selections' => [$oud->id, $amber->id], 'quantity' => 1,
        ]);

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertCreated()
            ->assertJsonPath('order.items.0.name', 'Duo du Soir')
            ->assertJsonPath('order.items.0.variant_label', '2 parfums')
            ->assertJsonPath('order.items.0.unit_price', 74700)
            ->assertJsonPath('order.items.0.compare_at_price', 83000)
            ->assertJsonPath('order.items.0.selections', [
                ['product_name' => 'Oud Royal', 'size_ml' => 50, 'unit_price' => 38000],
                ['product_name' => 'Ambre Nuit', 'size_ml' => 50, 'unit_price' => 45000],
            ]);
        $this->assertDatabaseHas('order_items', [
            'type' => 'pack',
            'pack_id' => $pack->id,
            'meta' => json_encode(['pack_type' => 'custom', 'pricing_type' => 'percent', 'pack_price' => null, 'discount_value' => 10]),
        ]);
        $this->assertDatabaseHas('order_item_selections', ['product_variant_id' => $oud->id, 'sku' => $oud->sku, 'position' => 1]);
        $this->assertDatabaseHas('order_item_selections', ['product_variant_id' => $amber->id, 'sku' => $amber->sku, 'position' => 2]);
    }

    public function test_checkout_counts_one_use_of_a_coupon_that_granted_a_discount(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant('Ambre Nuit', 45000), 1]]);
        $coupon = Coupon::factory()->percent(10)->create(['used_count' => 3]);
        $cart->coupon()->associate($coupon)->save();

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertCreated()
            ->assertJsonPath('order.discount_total', 4500);
        $this->assertSame(4, $coupon->fresh()->used_count);
    }

    public function test_checkout_does_not_count_a_coupon_that_granted_no_discount(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant('Échantillon', 99), 1]]);
        $coupon = Coupon::factory()->percent(1)->create(['code' => 'MICRO']);
        $cart->coupon()->associate($coupon)->save();

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertCreated()
            ->assertJsonPath('order.discount_total', 0)
            ->assertJsonPath('order.coupon_code', 'MICRO');
        $this->assertSame(0, $coupon->fresh()->used_count);
    }

    public function test_checkout_converts_the_cart_so_its_token_returns_an_empty_cart_afterwards(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()))->assertCreated();

        $response = $this->withCart($cart)->getJson('/api/cart');

        $response->assertOk()
            ->assertJsonPath('token', null)
            ->assertJsonPath('lines', []);
        $this->assertNotNull($cart->fresh()->converted_at);
    }

    public function test_checkout_logs_that_the_order_was_placed_online(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertCreated();
        $this->assertDatabaseHas('order_events', [
            'order_id' => Order::query()->sole()->id,
            'type' => 'status',
            'from' => null,
            'to' => 'pending',
            'note' => 'Commande passée en ligne.',
            'user_id' => null,
        ]);
    }

    public function test_signed_in_checkout_links_the_order_to_the_customer(): void
    {
        $customer = User::factory()->customer()->create();
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);

        $response = $this->actingAs($customer)->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertCreated();
        $this->assertDatabaseHas('orders', ['reference' => $response->json('order.reference'), 'user_id' => $customer->id]);
    }

    public function test_replaying_the_idempotency_key_returns_the_same_order_with_200_without_selling_twice(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit', stock: 10);
        $cart = $this->cartWith([[$amber, 2]]);
        $payload = $this->payload($this->deliverableCity());
        $first = $this->withCart($cart)->withHeader('Idempotency-Key', 'checkout-5f0c2a51-7d3e')->postJson('/api/checkout', $payload);

        $replay = $this->withCart($cart)->withHeader('Idempotency-Key', 'checkout-5f0c2a51-7d3e')->postJson('/api/checkout', $payload);

        $replay->assertOk()
            ->assertJsonPath('order.reference', $first->json('order.reference'))
            ->assertJsonPath('access_token', $first->json('access_token'));
        $this->assertDatabaseCount('orders', 1);
        $this->assertSame(8, $amber->fresh()->stock);
        $this->assertDatabaseCount('inventory_movements', 1);
    }

    public function test_reusing_an_idempotency_key_with_another_cart_returns_422(): void
    {
        $city = $this->deliverableCity();
        $firstCart = $this->cartWith([[$this->sellableVariant(), 1]]);
        $this->withCart($firstCart)->withHeader('Idempotency-Key', 'checkout-5f0c2a51-7d3e')->postJson('/api/checkout', $this->payload($city));
        $otherVariant = $this->sellableVariant('Oud Royal', stock: 10);
        $otherCart = $this->cartWith([[$otherVariant, 1]]);

        $response = $this->withCart($otherCart)->withHeader('Idempotency-Key', 'checkout-5f0c2a51-7d3e')->postJson('/api/checkout', $this->payload($city));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['idempotency_key' => 'Requête invalide. Veuillez recharger la page.']);
        $this->assertDatabaseCount('orders', 1);
        $this->assertSame(10, $otherVariant->fresh()->stock);
        $this->assertNull($otherCart->fresh()->converted_at);
    }

    public function test_checkout_beyond_the_current_stock_returns_422_and_writes_nothing(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit', stock: 5);
        $cart = $this->cartWith([[$amber, 3]]);
        $amber->forceFill(['stock' => 2])->save();

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['cart' => 'Ambre Nuit 50 ml : il n’en reste que 2.']);
        $this->assertNothingWasPlaced($cart);
        $this->assertSame(2, $amber->fresh()->stock);
    }

    public function test_checkout_to_a_city_whose_zone_is_suspended_returns_422_and_writes_nothing(): void
    {
        $amber = $this->sellableVariant('Ambre Nuit', stock: 5);
        $cart = $this->cartWith([[$amber, 1]]);
        $city = City::factory()->for(DeliveryZone::factory()->inactive(), 'zone')->create();

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($city));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['cart' => 'La livraison n’est pas disponible pour cette ville.']);
        $this->assertNothingWasPlaced($cart);
        $this->assertSame(5, $amber->fresh()->stock);
    }

    public function test_checkout_to_a_city_switched_off_by_the_store_returns_422_and_writes_nothing(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        $city = City::factory()->inactive()->create();

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($city));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['city_id' => 'La valeur choisie pour ville n’est pas valide.']);
        $this->assertNothingWasPlaced($cart);
    }

    public function test_checkout_without_email_returns_422_if_the_store_requires_one(): void
    {
        app(StoreSettings::class)->put(['checkout.email_required' => true]);
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity(), ['email' => null]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Le champ e-mail est obligatoire.']);
        $this->assertNothingWasPlaced($cart);
    }

    public function test_checkout_without_email_is_accepted_while_the_store_does_not_require_one(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity(), ['email' => null]));

        $response->assertCreated()
            ->assertJsonPath('order.email', null);
    }

    public function test_checkout_with_an_empty_form_returns_422_for_every_required_field(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);

        $response = $this->withCart($cart)->postJson('/api/checkout', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors([
                'customer_name' => 'Le champ nom complet est obligatoire.',
                'phone' => 'Le champ téléphone est obligatoire.',
                'city_id' => 'Le champ ville est obligatoire.',
                'address' => 'Le champ adresse est obligatoire.',
                'payment_method' => 'Le champ mode de paiement est obligatoire.',
            ]);
        $this->assertNothingWasPlaced($cart);
    }

    public function test_checkout_returns_422_while_cash_on_delivery_is_disabled(): void
    {
        app(StoreSettings::class)->put(['payment.cod_enabled' => false]);
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_method' => 'Ce mode de paiement n’est pas disponible.']);
        $this->assertNothingWasPlaced($cart);
    }

    public function test_checkout_with_a_coupon_that_expired_since_it_was_applied_returns_422(): void
    {
        $this->freezeTime();
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        $cart->coupon()->associate(Coupon::factory()->create(['ends_at' => now()->addHour()]))->save();
        $this->travel(2)->hours();

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['coupon' => 'Ce code a expiré.']);
        $this->assertNothingWasPlaced($cart);
    }

    public function test_checkout_without_a_cart_returns_422(): void
    {
        $response = $this->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertUnprocessable()
            ->assertJsonPath('message', 'Votre panier est introuvable ou vide.');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_of_an_empty_cart_returns_422(): void
    {
        $cart = Cart::create(['token' => (string) Str::uuid()]);

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['cart' => 'Votre panier est vide.']);
        $this->assertNothingWasPlaced($cart);
    }

    public function test_checkout_of_a_cart_already_ordered_returns_422(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        $cart->forceFill(['converted_at' => now()])->save();

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['cart' => 'Ce panier a déjà été commandé.']);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_with_an_invalid_phone_returns_422(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity(), ['phone' => '+33 6 12 34 56 78']));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'Saisissez un numéro marocain valide (ex. 06 12 34 56 78).']);
        $this->assertNothingWasPlaced($cart);
    }

    public function test_checkout_confirms_the_order_to_the_customer_and_alerts_the_orders_inbox(): void
    {
        app(StoreSettings::class)->put(['contact.email' => 'contact@myperfum.ma', 'notifications.orders_email' => 'commandes@myperfum.ma']);
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        Notification::fake();

        $response = $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()));

        $response->assertCreated();
        $reference = $response->json('order.reference');
        Notification::assertSentOnDemand(
            OrderConfirmation::class,
            fn (OrderConfirmation $notification, array $channels, AnonymousNotifiable $notifiable) => $notifiable->routes['mail'] === ['salma@example.com' => 'Salma Benali']
                && $notification->order->reference === $reference
                && $notification->replyToAddress === 'contact@myperfum.ma',
        );
        Notification::assertSentOnDemand(
            NewOrderAlert::class,
            fn (NewOrderAlert $notification, array $channels, AnonymousNotifiable $notifiable) => $notifiable->routes['mail'] === 'commandes@myperfum.ma'
                && $notification->order->reference === $reference,
        );
        Notification::assertCount(2);
    }

    public function test_checkout_alerts_the_store_when_an_order_takes_a_format_down_to_its_low_stock_threshold(): void
    {
        app(StoreSettings::class)->put(['notifications.orders_email' => 'commandes@myperfum.ma']);
        $variant = $this->sellableVariant(stock: 7);
        $variant->update(['low_stock_threshold' => 5]);
        Notification::fake();

        $this->withCart($this->cartWith([[$variant, 2]]))->postJson('/api/checkout', $this->payload($this->deliverableCity()))->assertCreated();

        Notification::assertSentOnDemand(
            LowStockAlert::class,
            fn (LowStockAlert $notification, array $channels, AnonymousNotifiable $notifiable) => $notifiable->routes['mail'] === 'commandes@myperfum.ma'
                && count($notification->variants) === 1
                && $notification->variants[0]->is($variant)
                && $notification->variants[0]->stock === 5,
        );
    }

    public function test_checkout_does_not_alert_again_for_a_format_already_under_its_threshold(): void
    {
        app(StoreSettings::class)->put(['notifications.orders_email' => 'commandes@myperfum.ma']);
        $variant = $this->sellableVariant(stock: 4);
        $variant->update(['low_stock_threshold' => 5]);
        Notification::fake();

        $this->withCart($this->cartWith([[$variant, 1]]))->postJson('/api/checkout', $this->payload($this->deliverableCity()))->assertCreated();

        Notification::assertSentOnDemandTimes(LowStockAlert::class, 0);
    }

    public function test_checkout_alerts_the_store_at_its_contact_email_while_no_orders_inbox_is_set(): void
    {
        app(StoreSettings::class)->put(['contact.email' => 'contact@myperfum.ma']);
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        Notification::fake();

        $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()))->assertCreated();

        Notification::assertSentOnDemand(
            NewOrderAlert::class,
            fn (NewOrderAlert $notification, array $channels, AnonymousNotifiable $notifiable) => $notifiable->routes['mail'] === 'contact@myperfum.ma',
        );
    }

    public function test_checkout_sends_no_store_alert_while_the_store_has_no_email_address(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        Notification::fake();

        $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()))->assertCreated();

        Notification::assertSentOnDemandTimes(NewOrderAlert::class, 0);
        Notification::assertSentOnDemandTimes(OrderConfirmation::class, 1);
    }

    public function test_checkout_without_an_email_address_sends_the_customer_no_confirmation(): void
    {
        app(StoreSettings::class)->put(['contact.email' => 'contact@myperfum.ma']);
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        Notification::fake();

        $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity(), ['email' => null]))->assertCreated();

        Notification::assertSentOnDemandTimes(OrderConfirmation::class, 0);
        Notification::assertSentOnDemandTimes(NewOrderAlert::class, 1);
    }

    public function test_replaying_the_idempotency_key_notifies_no_one_a_second_time(): void
    {
        app(StoreSettings::class)->put(['contact.email' => 'contact@myperfum.ma']);
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        $payload = $this->payload($this->deliverableCity());
        Notification::fake();
        $this->withCart($cart)->withHeader('Idempotency-Key', 'checkout-5f0c2a51-7d3e')->postJson('/api/checkout', $payload)->assertCreated();

        $this->withCart($cart)->withHeader('Idempotency-Key', 'checkout-5f0c2a51-7d3e')->postJson('/api/checkout', $payload)->assertOk();

        Notification::assertSentOnDemandTimes(OrderConfirmation::class, 1);
        Notification::assertSentOnDemandTimes(NewOrderAlert::class, 1);
    }

    public function test_refused_checkout_notifies_no_one(): void
    {
        app(StoreSettings::class)->put(['contact.email' => 'contact@myperfum.ma']);
        $amber = $this->sellableVariant('Ambre Nuit', stock: 5);
        $cart = $this->cartWith([[$amber, 3]]);
        $amber->forceFill(['stock' => 2])->save();
        Notification::fake();

        $this->withCart($cart)->postJson('/api/checkout', $this->payload($this->deliverableCity()))->assertUnprocessable();

        Notification::assertNothingSent();
    }

    public function test_arabic_checkout_records_the_language_and_names_items_in_arabic(): void
    {
        $variant = ProductVariant::factory()
            ->for(Product::factory()->published()->state(['name' => 'Ambre Nuit', 'name_ar' => 'ليلة العنبر']))
            ->create(['price' => 45000, 'size_ml' => 50]);
        $cart = $this->cartWith([[$variant, 1]]);
        $city = City::factory()->for(DeliveryZone::factory()->state(['fee' => 3000]), 'zone')->named('Casablanca')->create(['name_ar' => 'الدار البيضاء']);

        $response = $this->withCart($cart)->withHeader('X-Locale', 'ar')->postJson('/api/checkout', $this->payload($city));

        $response->assertCreated()
            ->assertJsonPath('order.items.0.name', 'ليلة العنبر')
            ->assertJsonPath('order.items.0.variant_label', '50 مل')
            ->assertJsonPath('order.status_label', 'قيد الانتظار');
        $this->assertDatabaseHas('orders', ['reference' => $response->json('order.reference'), 'locale' => 'ar', 'city_name' => 'الدار البيضاء']);
    }

    public function test_arabic_checkout_confirms_in_arabic_while_the_store_alert_stays_in_french(): void
    {
        app(StoreSettings::class)->put(['contact.email' => 'contact@myperfum.ma']);
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        Notification::fake();

        $this->withCart($cart)->withHeader('X-Locale', 'ar')->postJson('/api/checkout', $this->payload($this->deliverableCity()))->assertCreated();

        Notification::assertSentOnDemand(OrderConfirmation::class, fn (OrderConfirmation $notification) => $notification->locale === 'ar');
        Notification::assertSentOnDemand(NewOrderAlert::class, fn (NewOrderAlert $notification) => $notification->locale === 'fr');
    }

    public function test_arabic_checkout_explains_missing_fields_in_arabic(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);

        $response = $this->withCart($cart)->withHeader('X-Locale', 'ar')->postJson('/api/checkout', $this->payload($this->deliverableCity(), ['phone' => '']));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'حقل الهاتف مطلوب.']);
    }

    public function test_english_checkout_records_the_language_and_names_items_in_english(): void
    {
        $variant = ProductVariant::factory()
            ->for(Product::factory()->published()->state(['name' => 'Ambre Nuit', 'name_en' => 'Amber Night']))
            ->create(['price' => 45000, 'size_ml' => 50]);
        $cart = $this->cartWith([[$variant, 1]]);
        $city = City::factory()->for(DeliveryZone::factory()->state(['fee' => 3000]), 'zone')->named('Tanger')->create(['name_en' => 'Tangier']);

        $response = $this->withCart($cart)->withHeader('X-Locale', 'en')->postJson('/api/checkout', $this->payload($city));

        $response->assertCreated()
            ->assertJsonPath('order.items.0.name', 'Amber Night')
            ->assertJsonPath('order.items.0.variant_label', '50 ml')
            ->assertJsonPath('order.status_label', 'Pending');
        $this->assertDatabaseHas('orders', ['reference' => $response->json('order.reference'), 'locale' => 'en', 'city_name' => 'Tangier']);
    }

    public function test_english_checkout_confirms_in_english_while_the_store_alert_stays_in_french(): void
    {
        app(StoreSettings::class)->put(['contact.email' => 'contact@myperfum.ma']);
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);
        Notification::fake();

        $this->withCart($cart)->withHeader('X-Locale', 'en')->postJson('/api/checkout', $this->payload($this->deliverableCity()))->assertCreated();

        Notification::assertSentOnDemand(OrderConfirmation::class, fn (OrderConfirmation $notification) => $notification->locale === 'en');
        Notification::assertSentOnDemand(NewOrderAlert::class, fn (NewOrderAlert $notification) => $notification->locale === 'fr');
    }

    public function test_english_checkout_explains_missing_fields_in_english(): void
    {
        $cart = $this->cartWith([[$this->sellableVariant(), 1]]);

        $response = $this->withCart($cart)->withHeader('X-Locale', 'en')->postJson('/api/checkout', $this->payload($this->deliverableCity(), ['phone' => '']));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'The phone number field is required.']);
    }

    public function test_confirmation_shows_the_order_to_the_holder_of_the_guest_token(): void
    {
        $order = $this->placeOrder();

        $response = $this->getJson("/api/orders/{$order->reference}?token={$order->guest_token}");

        $response->assertOk()
            ->assertJsonPath('data.reference', $order->reference)
            ->assertJsonPath('data.total', 48000)
            ->assertJsonPath('data.items.*.name', ['Ambre Nuit']);
    }

    #[TestWith(['?token=not-the-right-token'])]
    #[TestWith(['?token='])]
    #[TestWith([''])]
    public function test_confirmation_returns_404_without_the_right_guest_token(string $query): void
    {
        $order = $this->placeOrder();

        $response = $this->getJson("/api/orders/{$order->reference}{$query}");

        $response->assertNotFound();
    }

    public function test_confirmation_shows_the_order_to_its_signed_in_owner_without_token(): void
    {
        $customer = User::factory()->customer()->create();
        $order = $this->placeOrder($customer);

        $response = $this->actingAs($customer)->getJson("/api/orders/{$order->reference}");

        $response->assertOk()
            ->assertJsonPath('data.reference', $order->reference);
    }

    public function test_confirmation_returns_404_to_another_signed_in_customer(): void
    {
        $order = $this->placeOrder(User::factory()->customer()->create());

        $response = $this->actingAs(User::factory()->customer()->create())->getJson("/api/orders/{$order->reference}");

        $response->assertNotFound();
    }

    private function sellableVariant(string $productName = 'Ambre Nuit', int $price = 45000, int $stock = 20): ProductVariant
    {
        return ProductVariant::factory()
            ->for(Product::factory()->published()->state(['name' => $productName]))
            ->create(['price' => $price, 'stock' => $stock]);
    }

    /**
     * @param  list<array{ProductVariant, int}>  $lines
     */
    private function cartWith(array $lines): Cart
    {
        $cart = Cart::create(['token' => (string) Str::uuid()]);

        foreach ($lines as [$variant, $quantity]) {
            $cart->items()->create(['type' => CartItemType::Product, 'product_variant_id' => $variant->id, 'quantity' => $quantity]);
        }

        return $cart;
    }

    private function deliverableCity(): City
    {
        return City::factory()->for(DeliveryZone::factory()->state(['fee' => 3000]), 'zone')->create();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(City $city, array $overrides = []): array
    {
        return [
            'customer_name' => 'Salma Benali',
            'phone' => '06 12 34 56 78',
            'email' => 'Salma@Example.com',
            'city_id' => $city->id,
            'address' => '12 rue des Orangers, Maârif',
            'delivery_notes' => 'Sonner deux fois',
            'payment_method' => 'cod',
            ...$overrides,
        ];
    }

    private function withCart(Cart $cart): static
    {
        return $this->withHeader('X-Cart-Token', $cart->token);
    }

    /**
     * A 450 DH order delivered for 30 DH, placed the way checkout places it.
     */
    private function placeOrder(?User $customer = null): Order
    {
        $cart = $this->cartWith([[$this->sellableVariant('Ambre Nuit', 45000), 1]]);

        return app(OrderPlacer::class)->place($cart, new CheckoutData(
            customerName: 'Salma Benali',
            phone: '+212612345678',
            email: null,
            city: $this->deliverableCity(),
            address: '12 rue des Orangers, Maârif',
            deliveryNotes: null,
            paymentMethod: PaymentMethod::CashOnDelivery,
        ), $customer, null);
    }

    private function assertNothingWasPlaced(Cart $cart): void
    {
        $this->assertDatabaseCount('orders', 0);
        $this->assertSame(0, InventoryMovement::query()->where('reason', InventoryReason::Sale)->count());
        $this->assertNull($cart->fresh()->converted_at);
    }
}
