<?php

namespace Tests\Feature\Http\Controllers\Api;

use App\Models\NewsletterSubscriber;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class NewsletterControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const THANK_YOU = 'Merci. Vous recevrez nos prochaines nouvelles.';

    private const UNSUBSCRIBED = 'Vous êtes désinscrit(e) de la newsletter.';

    public function test_subscribe_records_the_consented_address(): void
    {
        $this->freezeTime();

        $response = $this->postJson('/api/newsletter', ['email' => ' Lina@Example.com ', 'consent' => true, 'source' => 'footer']);

        $response->assertOk()
            ->assertExactJson(['message' => self::THANK_YOU]);
        $subscriber = NewsletterSubscriber::query()->sole();
        $this->assertSame('lina@example.com', $subscriber->email);
        $this->assertSame('subscribed', $subscriber->status);
        $this->assertSame('footer', $subscriber->source);
        $this->assertSame(now()->toDateTimeString(), $subscriber->consented_at->toDateTimeString());
        $this->assertSame(48, strlen($subscriber->unsubscribe_token));
    }

    public function test_subscribe_without_consent_returns_422_and_stores_nothing(): void
    {
        $response = $this->postJson('/api/newsletter', ['email' => 'lina@example.com']);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['consent' => 'Merci d’accepter de recevoir nos e-mails.']);
        $this->assertDatabaseCount('newsletter_subscribers', 0);
    }

    public function test_subscribing_a_known_address_gives_the_same_answer_without_a_duplicate(): void
    {
        $this->subscriber('lina@example.com');

        $response = $this->postJson('/api/newsletter', ['email' => 'LINA@example.com', 'consent' => true]);

        $response->assertOk()
            ->assertExactJson(['message' => self::THANK_YOU]);
        $this->assertDatabaseCount('newsletter_subscribers', 1);
    }

    public function test_subscribing_again_after_unsubscribing_restores_the_subscription_and_keeps_the_token(): void
    {
        $subscriber = $this->subscriber('lina@example.com', [
            'status' => 'unsubscribed',
            'unsubscribed_at' => now()->subMonth(),
            'unsubscribe_token' => str_repeat('t', 48),
        ]);

        $response = $this->postJson('/api/newsletter', ['email' => 'lina@example.com', 'consent' => true]);

        $response->assertOk();
        $subscriber->refresh();
        $this->assertSame('subscribed', $subscriber->status);
        $this->assertNull($subscriber->unsubscribed_at);
        $this->assertSame(str_repeat('t', 48), $subscriber->unsubscribe_token);
    }

    public function test_unsubscribe_with_the_token_marks_the_subscriber_unsubscribed(): void
    {
        $this->freezeTime();
        $subscriber = $this->subscriber('lina@example.com', ['unsubscribe_token' => str_repeat('t', 48)]);

        $response = $this->postJson('/api/newsletter/unsubscribe', ['token' => str_repeat('t', 48)]);

        $response->assertOk()
            ->assertExactJson(['message' => self::UNSUBSCRIBED]);
        $subscriber->refresh();
        $this->assertSame('unsubscribed', $subscriber->status);
        $this->assertSame(now()->toDateTimeString(), $subscriber->unsubscribed_at->toDateTimeString());
    }

    public function test_unsubscribe_with_an_unknown_token_gives_the_same_answer_and_changes_nothing(): void
    {
        $subscriber = $this->subscriber('lina@example.com', ['unsubscribe_token' => str_repeat('t', 48)]);

        $response = $this->postJson('/api/newsletter/unsubscribe', ['token' => str_repeat('x', 48)]);

        $response->assertOk()
            ->assertExactJson(['message' => self::UNSUBSCRIBED]);
        $this->assertSame('subscribed', $subscriber->fresh()->status);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function subscriber(string $email, array $attributes = []): NewsletterSubscriber
    {
        return NewsletterSubscriber::create([
            'email' => $email,
            'status' => 'subscribed',
            'source' => 'site',
            'consented_at' => now()->subYear(),
            'unsubscribe_token' => str_repeat('s', 48),
            ...$attributes,
        ]);
    }
}
