<?php

namespace Tests\Feature\Console\Commands;

use App\Console\Commands\LaunchCheck;
use App\Models\City;
use App\Models\DeliveryZone;
use App\Models\Page;
use App\Models\Product;
use App\Models\User;
use App\Services\Settings\StoreSettings;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LaunchCheckTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_a_fresh_store_is_not_ready_and_says_what_to_do(): void
    {
        $this->artisan('app:launch-check')
            ->expectsOutputToContain('APP_ENV=production et APP_DEBUG=false')
            ->expectsOutputToContain('MAIL_MAILER=smtp')
            ->expectsOutputToContain('php artisan app:create-admin')
            ->assertFailed();
    }

    public function test_a_store_ready_to_open_passes_every_check(): void
    {
        $this->readyStore();
        $createdLink = ! file_exists(public_path('storage')) && symlink(storage_path('app/public'), public_path('storage'));

        try {
            $this->artisan('app:launch-check')
                ->expectsOutputToContain('Tout est prêt')
                ->assertSuccessful();
        } finally {
            if ($createdLink) {
                unlink(public_path('storage'));
            }
        }
    }

    public function test_e_mails_waiting_for_minutes_mean_no_queue_worker_is_running(): void
    {
        $this->readyStore();
        DB::table('jobs')->insert(['queue' => 'default', 'payload' => '{}', 'attempts' => 0, 'available_at' => now()->subMinutes(10)->getTimestamp(), 'created_at' => now()->subMinutes(10)->getTimestamp()]);

        $this->artisan('app:launch-check')
            ->expectsOutputToContain('php artisan queue:work')
            ->assertFailed();
    }

    public function test_a_scheduler_silent_for_minutes_means_the_cron_is_missing(): void
    {
        $this->readyStore();
        Cache::put(LaunchCheck::HEARTBEAT, now()->subMinutes(10)->getTimestamp());

        $this->artisan('app:launch-check')
            ->expectsOutputToContain('* * * * * php artisan schedule:run')
            ->assertFailed();
    }

    private function readyStore(): void
    {
        $this->app['env'] = 'production';
        config([
            'app.debug' => false,
            'app.url' => 'https://www.myperfum.ma',
            'mail.default' => 'smtp',
            'mail.from.address' => 'commandes@myperfum.ma',
            'queue.default' => 'database',
        ]);
        Cache::put(LaunchCheck::HEARTBEAT, now()->getTimestamp());

        Product::factory()->published()->create();
        app(StoreSettings::class)->put(['contact.email' => 'contact@myperfum.ma', 'announcement.text' => 'Livraison offerte dès 500 DH']);
        foreach (['conditions-generales-de-vente', 'confidentialite'] as $slug) {
            Page::query()->create(['slug' => $slug, 'title' => $slug, 'body' => 'Texte', 'is_published' => true]);
        }
        City::factory()->for(DeliveryZone::factory(), 'zone')->create();
        User::factory()->admin()->create();
    }
}
