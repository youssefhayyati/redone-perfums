<?php

namespace App\Console\Commands;

use App\Models\Cart;
use App\Models\Collection;
use App\Models\Note;
use App\Models\Order;
use App\Models\Pack;
use App\Models\ProcessStep;
use App\Models\Product;
use App\Services\Settings\StoreSettings;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Clears the fictional catalogue (every record flagged `is_demo`) before the real one is
 * entered. Orders keep their own copy of names and prices, so past orders stay readable.
 * Families, delivery zones, pages, settings and accounts are kept.
 */
#[Signature('app:remove-demo-content
    {--orders : Also delete every order and cart placed so far (test orders)}
    {--force : Do not ask for confirmation}')]
#[Description('Delete the demo products, collections and packs before launch')]
class RemoveDemoContent extends Command
{
    public function handle(StoreSettings $settings): int
    {
        $counts = [
            'Produits' => Product::withTrashed()->where('is_demo', true)->count(),
            'Collections' => Collection::query()->where('is_demo', true)->count(),
            'Coffrets' => Pack::query()->where('is_demo', true)->count(),
            'Étapes du laboratoire (photos d’exemple)' => ProcessStep::query()->where('is_demo', true)->count(),
        ];
        if ($this->option('orders')) {
            $counts['Commandes'] = Order::query()->count();
            $counts['Paniers'] = Cart::query()->count();
        }

        if (array_sum($counts) === 0) {
            $this->info('Aucun contenu de démonstration à supprimer.');

            return self::SUCCESS;
        }

        $this->table(['À supprimer', 'Nombre'], collect($counts)->map(fn (int $count, string $label) => [$label, $count])->values()->all());

        if (! $this->option('force') && ! $this->confirm('Supprimer définitivement ce contenu ?')) {
            $this->warn('Rien n’a été supprimé.');

            return self::FAILURE;
        }

        DB::transaction(function () {
            Pack::query()->where('is_demo', true)->delete();
            Collection::query()->where('is_demo', true)->delete();
            // Variants, photos, notes and collection links go with each product.
            Product::withTrashed()->where('is_demo', true)->get()->each->forceDelete();
            Note::query()->doesntHave('products')->delete();
            // Steps whose stock photo was never replaced by one of the store's lab.
            ProcessStep::query()->where('is_demo', true)->delete();

            if ($this->option('orders')) {
                Order::query()->delete();
                Cart::query()->delete();
            }
        });

        // The default announcement says the catalogue is fictional: it would now be wrong.
        if ($settings->bool('announcement.enabled') && $settings->get('announcement.text') === StoreSettings::schema()['announcement.text']['default']) {
            $settings->put(['announcement.enabled' => false]);
            $this->line('La barre d’annonce de démonstration est désactivée ; rédigez la vôtre dans Réglages.');
        }

        $this->info('Contenu de démonstration supprimé.');

        return self::SUCCESS;
    }
}
