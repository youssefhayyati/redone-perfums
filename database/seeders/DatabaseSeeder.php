<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeds what a fresh store needs to be explored: a delivery grid, content pages and
 * a fictional demo catalogue. No account is created here — staff accounts are made
 * with `php artisan app:create-admin`.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            DeliverySeeder::class,
            PageSeeder::class,
            DemoCatalogSeeder::class,
        ]);
    }
}
