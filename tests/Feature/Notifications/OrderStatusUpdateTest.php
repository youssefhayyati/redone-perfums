<?php

namespace Tests\Feature\Notifications;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Notifications\OrderStatusUpdate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\App;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class OrderStatusUpdateTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[TestWith([OrderStatus::Confirmed, 'Votre commande RP-261021-AMBRE2 est confirmée'])]
    #[TestWith([OrderStatus::Shipped, 'Votre commande RP-261021-AMBRE2 est en route'])]
    #[TestWith([OrderStatus::Delivered, 'Votre commande RP-261021-AMBRE2 est livrée'])]
    #[TestWith([OrderStatus::Cancelled, 'Votre commande RP-261021-AMBRE2 est annulée'])]
    public function test_subject_tells_the_new_status_of_the_order(OrderStatus $status, string $subject): void
    {
        $mail = (new OrderStatusUpdate($this->order(), $status))->toMail(new AnonymousNotifiable);

        $this->assertSame($subject, $mail->subject);
    }

    public function test_shipped_order_gives_the_carrier_the_tracking_number_and_the_cash_to_prepare(): void
    {
        $order = $this->order(['carrier' => 'Amana', 'tracking_number' => 'AM123456789MA']);

        $html = $this->render(new OrderStatusUpdate($order, OrderStatus::Shipped));

        $this->assertStringContainsString('Amana', $html);
        $this->assertStringContainsString('AM123456789MA', $html);
        $this->assertMatchesRegularExpression('#Prévoyez <strong[^>]*>930\x{00A0}DH</strong> en espèces#u', $html);
    }

    public function test_shipped_order_already_paid_asks_for_no_cash(): void
    {
        $order = $this->order(['payment_status' => 'paid']);

        $html = $this->render(new OrderStatusUpdate($order, OrderStatus::Shipped));

        $this->assertStringNotContainsString('Prévoyez', $html);
    }

    public function test_links_to_the_order_page_with_its_guest_token(): void
    {
        $html = $this->render(new OrderStatusUpdate($this->order(), OrderStatus::Confirmed));

        $this->assertStringContainsString('href="'.config('app.url').'/commande/confirmation/RP-261021-AMBRE2?token=jeton-invite-ambre"', $html);
    }

    public function test_lets_the_customer_reply_to_the_store_contact_address(): void
    {
        $mail = (new OrderStatusUpdate($this->order(), OrderStatus::Cancelled, replyToAddress: 'contact@myperfum.ma'))->toMail(new AnonymousNotifiable);

        $this->assertSame([['contact@myperfum.ma', null]], $mail->replyTo);
    }

    public function test_arabic_order_hears_about_its_shipment_in_arabic(): void
    {
        $order = $this->order(['locale' => 'ar']);

        App::setLocale('ar');
        $mail = (new OrderStatusUpdate($order, OrderStatus::Shipped))->locale('ar')->toMail(new AnonymousNotifiable);
        $html = (string) $mail->render();

        $this->assertSame('طلبك RP-261021-AMBRE2 في الطريق إليك', $mail->subject);
        $this->assertStringContainsString('dir="rtl"', $html);
        $this->assertMatchesRegularExpression('#<strong[^>]*>930\x{00A0}درهم</strong>#u', $html);
        $this->assertStringContainsString('/ar/commande/confirmation/RP-261021-AMBRE2', $html);
    }

    public function test_english_order_hears_about_its_shipment_in_english(): void
    {
        $order = $this->order(['locale' => 'en', 'carrier' => 'Amana', 'tracking_number' => 'AM123']);

        App::setLocale('en');
        $mail = (new OrderStatusUpdate($order, OrderStatus::Shipped))->locale('en')->toMail(new AnonymousNotifiable);
        $html = (string) $mail->render();

        $this->assertSame('Your order RP-261021-AMBRE2 is on its way', $mail->subject);
        $this->assertStringContainsString('dir="ltr"', $html);
        $this->assertMatchesRegularExpression('#<strong[^>]*>930\x{00A0}DH</strong>#u', $html);
        $this->assertMatchesRegularExpression('#<strong[^>]*>Carrier</strong>: Amana#u', $html);
        $this->assertStringContainsString('/en/commande/confirmation/RP-261021-AMBRE2', $html);
    }

    /**
     * A cash-on-delivery order of 930 DH.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function order(array $attributes = []): Order
    {
        return Order::factory()->amounts(90000, deliveryFee: 3000)->create([
            'reference' => 'RP-261021-AMBRE2',
            'customer_name' => 'Salma Benali',
            'guest_token' => 'jeton-invite-ambre',
            ...$attributes,
        ]);
    }

    private function render(OrderStatusUpdate $notification): string
    {
        return (string) $notification->toMail(new AnonymousNotifiable)->render();
    }
}
