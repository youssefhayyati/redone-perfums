<?php

namespace Tests\Feature\Notifications;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Notifications\NewOrderAlert;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Tests\TestCase;

class NewOrderAlertTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_subject_gives_the_reference_and_the_total(): void
    {
        $order = $this->order();

        $mail = (new NewOrderAlert($order))->toMail(new AnonymousNotifiable);

        $this->assertSame("Nouvelle commande RP-261021-AMBRE2 — 930\u{00A0}DH", $mail->subject);
    }

    public function test_names_the_customer_with_their_phone_email_and_delivery_address(): void
    {
        $order = $this->order();

        $html = $this->render(new NewOrderAlert($order));

        $this->assertStringContainsString('Salma Benali', $html);
        $this->assertStringContainsString('06 12 34 56 78', $html);
        $this->assertStringContainsString('salma@example.com', $html);
        $this->assertStringContainsString('12 rue des Orangers, Maârif, Casablanca (Grand Casablanca)', $html);
    }

    public function test_lists_the_lines_to_prepare(): void
    {
        $order = $this->order();

        $html = $this->render(new NewOrderAlert($order));

        $this->assertStringContainsString('Ambre Nuit — 50 ml', $html);
        $this->assertMatchesRegularExpression('#<strong[^>]*>930\x{00A0}DH</strong>#u', $html);
    }

    public function test_shows_the_customer_delivery_instructions(): void
    {
        $order = $this->order(['delivery_notes' => 'Sonner deux fois']);

        $html = $this->render(new NewOrderAlert($order));

        $this->assertStringContainsString('Instructions de livraison : Sonner deux fois', $html);
    }

    public function test_links_to_the_order_in_the_administration(): void
    {
        $order = $this->order();

        $html = $this->render(new NewOrderAlert($order));

        $this->assertStringContainsString('href="'.config('app.url').'/admin/commandes/RP-261021-AMBRE2"', $html);
    }

    public function test_customer_text_cannot_add_a_link_to_the_store_email(): void
    {
        $order = $this->order(['delivery_notes' => '[Suivre votre colis](https://colis.example/suivi)']);

        $html = $this->render(new NewOrderAlert($order));

        $this->assertStringNotContainsString('href="https://colis.example/suivi"', $html);
        $this->assertStringContainsString('[Suivre votre colis](https://colis.example/suivi)', $html);
    }

    public function test_customer_text_cannot_add_html_to_the_store_email(): void
    {
        $order = $this->order(['customer_name' => 'Salma <img src=x onerror=alert(1)>']);

        $html = $this->render(new NewOrderAlert($order));

        $this->assertStringNotContainsString('<img src=x', $html);
        $this->assertStringContainsString('Salma &lt;img src=x onerror=alert(1)&gt;', $html);
    }

    /**
     * Two 50 ml bottles of Ambre Nuit at 450 DH, delivered to Casablanca for 30 DH.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function order(array $attributes = []): Order
    {
        $variant = ProductVariant::factory()
            ->for(Product::factory()->state(['name' => 'Ambre Nuit']))
            ->create(['price' => 45000]);

        return Order::factory()->withItem($variant, 2)->amounts(90000, deliveryFee: 3000)->create([
            'reference' => 'RP-261021-AMBRE2',
            'customer_name' => 'Salma Benali',
            'phone' => '+212612345678',
            'email' => 'salma@example.com',
            'address' => '12 rue des Orangers, Maârif',
            'city_name' => 'Casablanca',
            'delivery_zone_name' => 'Grand Casablanca',
            ...$attributes,
        ]);
    }

    private function render(NewOrderAlert $notification): string
    {
        return (string) $notification->toMail(new AnonymousNotifiable)->render();
    }
}
