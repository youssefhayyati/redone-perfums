<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\City;
use App\Models\Page;
use App\Models\Product;
use App\Models\User;
use App\Services\Settings\StoreSettings;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Before opening the store: everything that has to be true in production, each with
 * what to do when it is not. Fails while anything is missing, so it can gate a deploy.
 */
#[Signature('app:launch-check')]
#[Description('Check that the store is ready to open (configuration, e-mail, queue, content)')]
class LaunchCheck extends Command
{
    /** Cache key the scheduler refreshes every minute (routes/console.php). */
    public const HEARTBEAT = 'scheduler:heartbeat';

    public function handle(StoreSettings $settings): int
    {
        $checks = [
            ['Mode production', app()->isProduction() && ! config('app.debug'), 'APP_ENV=production et APP_DEBUG=false dans .env.'],
            ['Adresse en https', str_starts_with((string) config('app.url'), 'https://'), 'APP_URL=https://votre-domaine.ma, avec un certificat (Let’s Encrypt).'],
            ['Envoi des e-mails', ! in_array(config('mail.default'), ['log', 'array'], true), 'MAIL_MAILER=smtp et les accès SMTP de votre service d’envoi.'],
            ['Expéditeur des e-mails', ! str_ends_with((string) config('mail.from.address'), '@example.com'), 'MAIL_FROM_ADDRESS sur votre domaine, ex. commandes@votre-domaine.ma.'],
            ['File d’attente traitée', $this->queueIsWorked(), 'Laissez tourner « php artisan queue:work --tries=3 » (Supervisor) : il envoie les e-mails.'],
            ['Tâches planifiées', $this->schedulerRuns(), 'Ajoutez au cron du serveur : * * * * * php artisan schedule:run.'],
            ['Catalogue réel', ! Product::withTrashed()->where('is_demo', true)->exists() && Product::query()->published()->exists(), 'php artisan app:remove-demo-content, puis ajoutez vos parfums.'],
            ['E-mail de contact', filled($settings->get('contact.email')), 'Réglages, rubrique Contact : l’adresse qui reçoit les commandes et les réponses.'],
            ['Pages légales publiées', Page::query()->whereIn('slug', ['conditions-generales-de-vente', 'confidentialite'])->where('is_published', true)->count() === 2, 'Pages : publiez les conditions générales de vente et la confidentialité.'],
            ['Barre d’annonce', ! $settings->bool('announcement.enabled') || $settings->get('announcement.text') !== StoreSettings::schema()['announcement.text']['default'], 'Réglages, rubrique Barre d’annonce : elle dit encore que le catalogue est fictif.'],
            ['Livraison', City::query()->deliverable()->exists(), 'Livraison : au moins une ville active dans une zone active.'],
            ['Compte administrateur', User::query()->where('role', UserRole::Admin)->where('is_active', true)->exists(), 'php artisan app:create-admin'],
            ['Photos publiées', is_link(public_path('storage')) || is_dir(public_path('storage')), 'php artisan storage:link'],
        ];

        $this->table(['', 'Vérification', 'À faire'], array_map(fn (array $check) => [$check[1] ? '✓' : '✗', $check[0], $check[1] ? '' : $check[2]], $checks));

        $missing = count(array_filter($checks, fn (array $check) => ! $check[1]));

        if ($missing > 0) {
            $this->error($missing === 1 ? 'Encore 1 point avant l’ouverture.' : "Encore {$missing} points avant l’ouverture.");

            return self::FAILURE;
        }

        $this->info('Tout est prêt : la boutique peut ouvrir.');

        return self::SUCCESS;
    }

    /** A worker takes jobs within a minute or two; older waiting jobs mean none is running. */
    private function queueIsWorked(): bool
    {
        if (config('queue.default') === 'sync') {
            return true;
        }

        return ! DB::table('jobs')->where('created_at', '<', now()->subMinutes(5)->getTimestamp())->exists();
    }

    private function schedulerRuns(): bool
    {
        $last = Cache::get(self::HEARTBEAT);

        return is_int($last) && $last >= now()->subMinutes(3)->getTimestamp();
    }
}
