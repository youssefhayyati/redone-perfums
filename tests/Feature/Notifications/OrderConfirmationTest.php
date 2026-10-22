<?php

namespace Tests\Feature\Notifications;

use App\Enums\CartItemType;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Notifications\OrderConfirmation;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class OrderConfirmationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_subject_names_the_order_reference(): void
    {
        $order = $this->order();

        $mail = (new OrderConfirmation($order))->toMail(new AnonymousNotifiable);

        $this->assertSame('Votre commande RP-261021-AMBRE2 est bien reçue', $mail->subject);
    }

    public function test_lists_each_line_and_the_total_to_pay_on_delivery(): void
    {
        $order = $this->order();

        $html = $this->render(new OrderConfirmation($order));

        $this->assertStringContainsString('Ambre Nuit — 50 ml', $html);
        $this->assertStringContainsString(">900\u{00A0}DH</td>", $html);
        $this->assertStringContainsString(">30\u{00A0}DH</td>", $html);
        $this->assertMatchesRegularExpression('#<strong[^>]*>930\x{00A0}DH</strong>#u', $html);
        $this->assertStringContainsString('Paiement : Paiement à la livraison', $html);
    }

    public function test_pack_line_lists_the_perfumes_chosen_for_the_pack(): void
    {
        $order = Order::factory()->amounts(101200)->create(['reference' => 'RP-261021-COFFR3']);
        $pack = $order->items()->create([
            'type' => CartItemType::Pack,
            'name' => 'Coffret Découverte',
            'unit_price' => 101200,
            'quantity' => 1,
            'line_total' => 101200,
        ]);
        $pack->selections()->createMany([
            ['product_name' => 'Nuit d’Ambre', 'size_ml' => 30, 'sku' => 'NA-30', 'unit_price' => 49000, 'position' => 1],
            ['product_name' => 'Oud Minuit', 'size_ml' => 30, 'sku' => 'OM-30', 'unit_price' => 62000, 'position' => 2],
        ]);

        $html = $this->render(new OrderConfirmation($order));

        $this->assertStringContainsString('Coffret Découverte', $html);
        $this->assertStringContainsString('Nuit d’Ambre 30 ml, Oud Minuit 30 ml', $html);
    }

    public function test_gives_the_delivery_address_and_the_phone_the_courier_will_call(): void
    {
        $order = $this->order();

        $html = $this->render(new OrderConfirmation($order));

        $this->assertStringContainsString('12 rue des Orangers, Maârif', $html);
        $this->assertStringContainsString('Casablanca', $html);
        $this->assertStringContainsString('06 12 34 56 78', $html);
    }

    public function test_links_to_the_order_page_with_its_guest_token(): void
    {
        $order = $this->order();

        $html = $this->render(new OrderConfirmation($order));

        $this->assertStringContainsString('href="'.config('app.url').'/commande/confirmation/RP-261021-AMBRE2?token=jeton-invite-ambre"', $html);
    }

    public function test_lets_the_customer_reply_to_the_store_contact_address(): void
    {
        $order = $this->order();

        $mail = (new OrderConfirmation($order, replyToAddress: 'contact@myperfum.ma'))->toMail(new AnonymousNotifiable);

        $this->assertSame([['contact@myperfum.ma', null]], $mail->replyTo);
        $this->assertStringContainsString('Une question ? Répondez simplement à cet e-mail.', (string) $mail->render());
    }

    public function test_offers_no_reply_while_the_store_has_no_contact_address(): void
    {
        $order = $this->order();

        $mail = (new OrderConfirmation($order))->toMail(new AnonymousNotifiable);

        $this->assertSame([], $mail->replyTo);
        $this->assertStringNotContainsString('Répondez simplement', (string) $mail->render());
    }

    public function test_arabic_order_is_confirmed_in_arabic_right_to_left(): void
    {
        $order = $this->order();
        $order->forceFill(['locale' => 'ar'])->save();

        $mail = (new OrderConfirmation($order))->locale('ar');
        App::setLocale('ar');
        $message = $mail->toMail(new AnonymousNotifiable);
        $html = (string) $message->render();

        $this->assertSame('تم استلام طلبك RP-261021-AMBRE2', $message->subject);
        $this->assertStringContainsString('dir="rtl"', $html);
        $this->assertStringContainsString('شكرًا، Salma.', $html);
        $this->assertStringContainsString('href="'.config('app.url').'/ar/commande/confirmation/RP-261021-AMBRE2?token=jeton-invite-ambre"', $html);
    }

    public function test_english_order_is_confirmed_in_english_left_to_right(): void
    {
        $order = $this->order();
        $order->forceFill(['locale' => 'en'])->save();

        $mail = (new OrderConfirmation($order))->locale('en');
        App::setLocale('en');
        $message = $mail->toMail(new AnonymousNotifiable);
        $html = (string) $message->render();

        $this->assertSame('We have received your order RP-261021-AMBRE2', $message->subject);
        $this->assertStringContainsString('dir="ltr"', $html);
        $this->assertStringContainsString('Thank you, Salma.', $html);
        $this->assertStringContainsString('Track my order', $html);
        $this->assertStringContainsString("930\u{00A0}DH", $html);
        $this->assertStringContainsString('href="'.config('app.url').'/en/commande/confirmation/RP-261021-AMBRE2?token=jeton-invite-ambre"', $html);
    }

    /**
     * Two 50 ml bottles of Ambre Nuit at 450 DH, delivered to Casablanca for 30 DH.
     */
    private function order(): Order
    {
        $variant = ProductVariant::factory()
            ->for(Product::factory()->state(['name' => 'Ambre Nuit']))
            ->create(['price' => 45000]);

        return Order::factory()->withItem($variant, 2)->amounts(90000, deliveryFee: 3000)->create([
            'reference' => 'RP-261021-AMBRE2',
            'customer_name' => 'Salma Benali',
            'phone' => '+212612345678',
            'address' => '12 rue des Orangers, Maârif',
            'city_name' => 'Casablanca',
            'guest_token' => 'jeton-invite-ambre',
        ]);
    }

    private function render(OrderConfirmation $notification): string
    {
        return (string) $notification->toMail(new AnonymousNotifiable)->render();
    }
}
