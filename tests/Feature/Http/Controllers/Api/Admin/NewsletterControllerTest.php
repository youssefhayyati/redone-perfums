<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\NewsletterSubscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class NewsletterControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_index_lists_subscribers_with_the_count_of_each_status(): void
    {
        foreach (['amal@example.com', 'badr@example.com', 'chama@example.com'] as $email) {
            $this->subscriber($email, 'subscribed');
        }
        $this->subscriber('driss@example.com', 'unsubscribed');

        $response = $this->actingAs($this->manager())->getJson('/api/admin/newsletter');

        $response->assertOk()
            ->assertJsonPath('meta.total', 4)
            ->assertJsonPath('counts', ['subscribed' => 3, 'unsubscribed' => 1]);
    }

    public function test_index_filters_by_status_and_searches_the_address(): void
    {
        $this->subscriber('lina@example.com', 'unsubscribed');
        $this->subscriber('lina.b@example.com', 'subscribed');
        $this->subscriber('omar@example.com', 'unsubscribed');

        $response = $this->actingAs($this->manager())->getJson('/api/admin/newsletter?status=unsubscribed&search=lina');

        $response->assertOk()
            ->assertJsonPath('data.*.email', ['lina@example.com']);
    }

    private function subscriber(string $email, string $status): NewsletterSubscriber
    {
        return NewsletterSubscriber::create([
            'email' => $email,
            'status' => $status,
            'source' => 'site',
            'consented_at' => now()->subMonth(),
            'unsubscribed_at' => $status === 'unsubscribed' ? now()->subWeek() : null,
            'unsubscribe_token' => Str::random(48),
        ]);
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}
