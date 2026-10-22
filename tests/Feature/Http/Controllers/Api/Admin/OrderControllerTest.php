<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Enums\CartItemType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Cart;
use App\Models\City;
use App\Models\Order;
use App\Models\Pack;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Checkout\CheckoutData;
use App\Services\Checkout\OrderPlacer;
use App\Support\Locale;
use Closure;
use Database\Factories\OrderFactory;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OrderControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_index_filters_by_status_and_counts_orders_per_status(): void
    {
        Order::factory()->create();
        $confirmed = Order::factory()->confirmed()->create();
        Order::factory()->cancelled()->create();

        $response = $this->actingAs($this->support())->getJson('/api/admin/orders?status=confirmed');

        $response->assertOk()
            ->assertJsonPath('data.*.reference', [$confirmed->reference])
            ->assertJsonPath('counts', ['cancelled' => 1, 'confirmed' => 1, 'pending' => 1]);
    }

    public function test_index_filters_by_payment_status(): void
    {
        $paid = Order::factory()->paid()->create();
        Order::factory()->create();

        $response = $this->actingAs($this->support())->getJson('/api/admin/orders?payment_status=paid');

        $response->assertOk()
            ->assertJsonPath('data.*.reference', [$paid->reference]);
    }

    public function test_index_filters_by_placement_dates_including_the_whole_last_day(): void
    {
        Order::factory()->placedAt('2026-10-04 23:59:00')->create();
        $lastDay = Order::factory()->placedAt('2026-10-10 22:15:00')->create();
        $firstDay = Order::factory()->placedAt('2026-10-05 00:05:00')->create();
        Order::factory()->placedAt('2026-10-11 00:01:00')->create();

        $response = $this->actingAs($this->support())->getJson('/api/admin/orders?from=2026-10-05&to=2026-10-10');

        $response->assertOk()
            ->assertJsonPath('data.*.reference', [$lastDay->reference, $firstDay->reference]);
    }

    public function test_index_rejects_an_unknown_status_filter_with_422(): void
    {
        $response = $this->actingAs($this->support())->getJson('/api/admin/orders?status=lost');

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'La valeur choisie pour statut n’est pas valide.']);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function searchTerms(): array
    {
        return [
            'reference fragment' => ['ABC234'],
            'customer name' => ['benali'],
            'phone typed in national format' => ['06 12 34 56 78'],
            'email' => ['salma@'],
        ];
    }

    #[DataProvider('searchTerms')]
    public function test_index_search_finds_the_order(string $term): void
    {
        $target = Order::factory()->create([
            'reference' => 'RP-261021-ABC234', 'customer_name' => 'Salma Benali', 'phone' => '+212612345678', 'email' => 'salma@example.com',
        ]);
        Order::factory()->create([
            'reference' => 'RP-261021-XYZ789', 'customer_name' => 'Karim Idrissi', 'phone' => '+212698765432', 'email' => 'karim@example.com',
        ]);

        $response = $this->actingAs($this->support())->getJson('/api/admin/orders?search='.urlencode($term));

        $response->assertOk()
            ->assertJsonPath('data.*.reference', [$target->reference]);
    }

    public function test_show_returns_the_lines_events_and_customer_account(): void
    {
        $customer = User::factory()->customer()->create(['name' => 'Salma Benali']);
        $order = $this->placeOrder([[$this->variant('Ambre Nuit'), 2]], $customer);

        $response = $this->actingAs($this->support())->getJson("/api/admin/orders/{$order->reference}");

        $response->assertOk()
            ->assertJsonPath('data.customer.name', 'Salma Benali')
            ->assertJsonPath('data.phone', '06 12 34 56 78')
            ->assertJsonPath('data.phone_e164', '+212612345678')
            ->assertJsonPath('data.items.0.name', 'Ambre Nuit')
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.events.0.note', 'Commande passée en ligne.')
            ->assertJsonPath('data.allowed_transitions.*.value', ['confirmed', 'cancelled']);
    }

    public function test_show_returns_the_language_the_customer_ordered_in(): void
    {
        $order = Order::factory()->create(['locale' => Locale::ARABIC]);

        $this->actingAs($this->support())
            ->getJson("/api/admin/orders/{$order->reference}")
            ->assertOk()
            ->assertJsonPath('data.locale', 'ar');
    }

    public function test_allowed_status_change_is_applied_and_logged(): void
    {
        $support = $this->support();
        $order = Order::factory()->create();

        $response = $this->actingAs($support)->postJson("/api/admin/orders/{$order->reference}/status", [
            'status' => 'confirmed', 'note' => 'Confirmée par téléphone.',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.status_label', 'Confirmée')
            ->assertJsonPath('data.allowed_transitions.*.value', ['processing', 'cancelled']);
        $this->assertSame(OrderStatus::Confirmed, $order->fresh()->status);
        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id, 'type' => 'status', 'from' => 'pending', 'to' => 'confirmed',
            'note' => 'Confirmée par téléphone.', 'user_id' => $support->id,
        ]);
    }

    public function test_status_change_outside_the_workflow_returns_422_and_changes_nothing(): void
    {
        $order = Order::factory()->create();

        $response = $this->actingAs($this->support())->postJson("/api/admin/orders/{$order->reference}/status", ['status' => 'shipped']);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Impossible de passer une commande « En attente » à « Expédiée ».']);
        $this->assertSame(OrderStatus::Pending, $order->fresh()->status);
        $this->assertDatabaseCount('order_events', 0);
    }

    public function test_cancelling_restocks_every_bottle_and_takes_the_sales_back(): void
    {
        $this->freezeTime();
        $support = $this->support();
        $amber = $this->variant('Ambre Nuit', stock: 10);
        $oud = $this->variant('Oud Royal', stock: 10);
        $order = $this->placeOrder([[$amber, 2]], packSelections: [$amber, $oud]);

        $response = $this->actingAs($support)->postJson("/api/admin/orders/{$order->reference}/status", ['status' => 'cancelled']);

        $response->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.cancelled_at', now()->toIso8601String());
        $this->assertSame([10, 10], [$amber->fresh()->stock, $oud->fresh()->stock]);
        $this->assertSame([0, 0], [$amber->product->fresh()->sales_count, $oud->product->fresh()->sales_count]);
        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => $amber->id, 'change' => 3, 'stock_after' => 10, 'reason' => 'cancellation',
            'order_id' => $order->id, 'user_id' => $support->id,
        ]);
        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => $oud->id, 'change' => 1, 'stock_after' => 10, 'reason' => 'cancellation',
            'order_id' => $order->id, 'user_id' => $support->id,
        ]);
    }

    public function test_cancelling_floors_the_sales_count_at_zero(): void
    {
        $amber = $this->variant('Ambre Nuit', stock: 10);
        $order = $this->placeOrder([[$amber, 3]]);
        $amber->product->forceFill(['sales_count' => 1])->save();

        $response = $this->actingAs($this->support())->postJson("/api/admin/orders/{$order->reference}/status", ['status' => 'cancelled']);

        $response->assertOk();
        $this->assertSame(0, $amber->product->fresh()->sales_count);
        $this->assertSame(10, $amber->fresh()->stock);
    }

    public function test_marking_an_order_delivered_records_the_delivery_time(): void
    {
        $this->freezeTime();
        $order = Order::factory()->shipped()->create();

        $response = $this->actingAs($this->support())->postJson("/api/admin/orders/{$order->reference}/status", ['status' => 'delivered']);

        $response->assertOk()
            ->assertJsonPath('data.delivered_at', now()->toIso8601String());
        $this->assertSame(OrderStatus::Delivered, $order->fresh()->status);
    }

    public function test_payment_received_is_recorded_and_logged(): void
    {
        $support = $this->support();
        $order = Order::factory()->delivered()->create();

        $response = $this->actingAs($support)->postJson("/api/admin/orders/{$order->reference}/payment", [
            'payment_status' => 'paid', 'note' => 'Encaissé par le livreur.',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.allowed_payment_transitions.*.value', ['refunded', 'unpaid']);
        $this->assertSame(PaymentStatus::Paid, $order->fresh()->payment_status);
        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id, 'type' => 'payment', 'from' => 'unpaid', 'to' => 'paid',
            'note' => 'Encaissé par le livreur.', 'user_id' => $support->id,
        ]);
    }

    /**
     * @return array<string, array{Closure(OrderFactory): OrderFactory, string, string}>
     */
    public static function refusedPaymentChanges(): array
    {
        return [
            'refunded order paid again' => [
                fn (OrderFactory $order) => $order->state(['payment_status' => PaymentStatus::Refunded]),
                'paid',
                'Impossible de passer le paiement de « Remboursée » à « Payée ».',
            ],
            'unpaid order refunded' => [
                fn (OrderFactory $order) => $order,
                'refunded',
                'Impossible de passer le paiement de « Non payée » à « Remboursée ».',
            ],
            'cancelled order paid' => [
                fn (OrderFactory $order) => $order->cancelled(),
                'paid',
                'Une commande annulée ne peut pas être marquée payée.',
            ],
        ];
    }

    /**
     * @param  Closure(OrderFactory): OrderFactory  $state
     */
    #[DataProvider('refusedPaymentChanges')]
    public function test_payment_change_outside_the_workflow_returns_422_and_changes_nothing(Closure $state, string $to, string $message): void
    {
        $order = $state(Order::factory())->create();
        $before = $order->payment_status;

        $response = $this->actingAs($this->support())->postJson("/api/admin/orders/{$order->reference}/payment", ['payment_status' => $to]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_status' => $message]);
        $this->assertSame($before, $order->fresh()->payment_status);
        $this->assertDatabaseCount('order_events', 0);
    }

    public function test_tracking_details_of_a_shipped_order_can_be_updated_and_are_logged(): void
    {
        $support = $this->support();
        $order = Order::factory()->shipped()->create();

        $response = $this->actingAs($support)->patchJson("/api/admin/orders/{$order->reference}/delivery", [
            'carrier' => 'Amana', 'tracking_number' => 'AM123456789MA',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.carrier', 'Amana')
            ->assertJsonPath('data.tracking_number', 'AM123456789MA');
        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id, 'type' => 'delivery', 'note' => 'Champs modifiés : carrier, tracking_number', 'user_id' => $support->id,
        ]);
    }

    public function test_unchanged_address_fields_sent_with_tracking_details_are_accepted_after_shipping(): void
    {
        $order = Order::factory()->shipped()->create([
            'customer_name' => 'Salma Benali', 'phone' => '+212612345678', 'address' => '12 rue des Orangers, Maârif', 'delivery_notes' => null,
        ]);

        $response = $this->actingAs($this->support())->patchJson("/api/admin/orders/{$order->reference}/delivery", [
            'customer_name' => 'Salma Benali',
            'phone' => '06 12 34 56 78',
            'address' => '12 rue des Orangers, Maârif',
            'delivery_notes' => null,
            'carrier' => 'Amana',
            'tracking_number' => 'AM123456789MA',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.carrier', 'Amana');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'tracking_number' => 'AM123456789MA', 'phone' => '+212612345678']);
        $this->assertDatabaseHas('order_events', ['order_id' => $order->id, 'type' => 'delivery', 'note' => 'Champs modifiés : carrier, tracking_number']);
    }

    public function test_address_change_before_shipping_normalizes_the_phone_and_logs_the_changed_fields(): void
    {
        $order = Order::factory()->confirmed()->create(['phone' => '+212612345678', 'address' => '12 rue des Orangers, Maârif']);

        $response = $this->actingAs($this->support())->patchJson("/api/admin/orders/{$order->reference}/delivery", [
            'phone' => '07 01 02 03 04',
            'address' => '45 boulevard d’Anfa, Gauthier',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.phone', '07 01 02 03 04');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'phone' => '+212701020304', 'address' => '45 boulevard d’Anfa, Gauthier']);
        $this->assertDatabaseHas('order_events', ['order_id' => $order->id, 'type' => 'delivery', 'note' => 'Champs modifiés : phone, address']);
    }

    /**
     * @return array<string, array{Closure(OrderFactory): OrderFactory}>
     */
    public static function ordersPastShipping(): array
    {
        return [
            'shipped' => [fn (OrderFactory $order) => $order->shipped()],
            'delivered' => [fn (OrderFactory $order) => $order->delivered()],
            'cancelled' => [fn (OrderFactory $order) => $order->cancelled()],
        ];
    }

    /**
     * @param  Closure(OrderFactory): OrderFactory  $state
     */
    #[DataProvider('ordersPastShipping')]
    public function test_address_change_after_shipping_returns_422_and_changes_nothing(Closure $state): void
    {
        $order = $state(Order::factory())->create(['address' => '12 rue des Orangers, Maârif']);

        $response = $this->actingAs($this->support())->patchJson("/api/admin/orders/{$order->reference}/delivery", [
            'address' => '45 boulevard d’Anfa, Gauthier',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['address' => 'L’adresse ne peut plus être modifiée une fois la commande expédiée.']);
        $this->assertSame('12 rue des Orangers, Maârif', $order->fresh()->address);
        $this->assertDatabaseCount('order_events', 0);
    }

    public function test_delivery_update_with_unchanged_values_logs_nothing(): void
    {
        $order = Order::factory()->create(['customer_name' => 'Salma Benali']);

        $response = $this->actingAs($this->support())->patchJson("/api/admin/orders/{$order->reference}/delivery", [
            'customer_name' => 'Salma Benali',
        ]);

        $response->assertOk();
        $this->assertDatabaseCount('order_events', 0);
    }

    public function test_delivery_update_with_a_foreign_phone_returns_422(): void
    {
        $order = Order::factory()->create(['phone' => '+212612345678']);

        $response = $this->actingAs($this->support())->patchJson("/api/admin/orders/{$order->reference}/delivery", [
            'phone' => '+33 6 12 34 56 78',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'Saisissez un numéro marocain valide (ex. 06 12 34 56 78).']);
        $this->assertSame('+212612345678', $order->fresh()->phone);
    }

    public function test_internal_note_is_added_to_the_order_history_and_returns_201(): void
    {
        $support = User::factory()->support()->create(['name' => 'Karim Idrissi']);
        $order = Order::factory()->create();

        $response = $this->actingAs($support)->postJson("/api/admin/orders/{$order->reference}/notes", [
            'note' => 'La cliente souhaite être appelée après 18 h.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.events.0.type', 'note')
            ->assertJsonPath('data.events.0.note', 'La cliente souhaite être appelée après 18 h.')
            ->assertJsonPath('data.events.0.user', 'Karim Idrissi');
        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id, 'type' => 'note', 'note' => 'La cliente souhaite être appelée après 18 h.', 'user_id' => $support->id,
        ]);
    }

    private function support(): User
    {
        return User::factory()->support()->create();
    }

    private function variant(string $productName, int $price = 45000, int $stock = 20): ProductVariant
    {
        return ProductVariant::factory()
            ->for(Product::factory()->published()->state(['name' => $productName]))
            ->create(['price' => $price, 'stock' => $stock]);
    }

    /**
     * Place a real order (stock, sales and snapshots written by OrderPlacer).
     *
     * @param  list<array{ProductVariant, int}>  $lines
     * @param  list<ProductVariant>  $packSelections  perfumes of one custom pack line, if any
     */
    private function placeOrder(array $lines, ?User $customer = null, array $packSelections = []): Order
    {
        $cart = Cart::create(['token' => (string) Str::uuid()]);

        foreach ($lines as [$variant, $quantity]) {
            $cart->items()->create(['type' => CartItemType::Product, 'product_variant_id' => $variant->id, 'quantity' => $quantity]);
        }

        if ($packSelections !== []) {
            $pack = Pack::factory()->custom(count($packSelections))->create();
            $cart->items()->create([
                'type' => CartItemType::Pack,
                'pack_id' => $pack->id,
                'selections' => array_map(fn (ProductVariant $variant) => $variant->id, $packSelections),
                'quantity' => 1,
            ]);
        }

        return app(OrderPlacer::class)->place($cart, new CheckoutData(
            customerName: 'Salma Benali',
            phone: '+212612345678',
            email: null,
            city: City::factory()->create(),
            address: '12 rue des Orangers, Maârif',
            deliveryNotes: null,
            paymentMethod: PaymentMethod::CashOnDelivery,
        ), $customer, null);
    }
}
