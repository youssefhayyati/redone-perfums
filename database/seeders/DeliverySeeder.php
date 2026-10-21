<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\DeliveryZone;
use Illuminate\Database\Seeder;

/**
 * Starting delivery grid for Morocco. Fees, thresholds and delays are examples the
 * store must confirm with its carrier (the dashboard setup checklist links here).
 */
class DeliverySeeder extends Seeder
{
    /**
     * @var list<array{name: string, fee: int, free_shipping_threshold: int, delivery_estimate: string, cities: array<string, string>}>
     */
    private const ZONES = [
        [
            'name' => 'Grand Casablanca',
            'fee' => 2500,
            'free_shipping_threshold' => 60000,
            'delivery_estimate' => '24 à 48 h',
            'cities' => [
                'Casablanca' => 'Casablanca-Settat',
                'Mohammédia' => 'Casablanca-Settat',
                'Bouskoura' => 'Casablanca-Settat',
                'Dar Bouazza' => 'Casablanca-Settat',
            ],
        ],
        [
            'name' => 'Grandes villes',
            'fee' => 3500,
            'free_shipping_threshold' => 80000,
            'delivery_estimate' => '48 à 72 h',
            'cities' => [
                'Rabat' => 'Rabat-Salé-Kénitra',
                'Salé' => 'Rabat-Salé-Kénitra',
                'Témara' => 'Rabat-Salé-Kénitra',
                'Kénitra' => 'Rabat-Salé-Kénitra',
                'Marrakech' => 'Marrakech-Safi',
                'Fès' => 'Fès-Meknès',
                'Meknès' => 'Fès-Meknès',
                'Tanger' => 'Tanger-Tétouan-Al Hoceïma',
                'Tétouan' => 'Tanger-Tétouan-Al Hoceïma',
                'Agadir' => 'Souss-Massa',
                'El Jadida' => 'Casablanca-Settat',
                'Oujda' => 'Oriental',
            ],
        ],
        [
            'name' => 'Reste du Maroc',
            'fee' => 4500,
            'free_shipping_threshold' => 100000,
            'delivery_estimate' => '3 à 5 jours ouvrés',
            'cities' => [
                'Settat' => 'Casablanca-Settat',
                'Berrechid' => 'Casablanca-Settat',
                'Khouribga' => 'Béni Mellal-Khénifra',
                'Béni Mellal' => 'Béni Mellal-Khénifra',
                'Safi' => 'Marrakech-Safi',
                'Essaouira' => 'Marrakech-Safi',
                'Ifrane' => 'Fès-Meknès',
                'Taza' => 'Fès-Meknès',
                'Larache' => 'Tanger-Tétouan-Al Hoceïma',
                'Chefchaouen' => 'Tanger-Tétouan-Al Hoceïma',
                'Al Hoceïma' => 'Tanger-Tétouan-Al Hoceïma',
                'Nador' => 'Oriental',
                'Taroudant' => 'Souss-Massa',
                'Ouarzazate' => 'Drâa-Tafilalet',
                'Errachidia' => 'Drâa-Tafilalet',
                'Guelmim' => 'Guelmim-Oued Noun',
                'Laâyoune' => 'Laâyoune-Sakia El Hamra',
                'Dakhla' => 'Dakhla-Oued Ed-Dahab',
            ],
        ],
    ];

    public function run(): void
    {
        foreach (self::ZONES as $position => $definition) {
            $zone = DeliveryZone::updateOrCreate(
                ['name' => $definition['name']],
                [
                    'fee' => $definition['fee'],
                    'free_shipping_threshold' => $definition['free_shipping_threshold'],
                    'delivery_estimate' => $definition['delivery_estimate'],
                    'is_active' => true,
                    'sort_order' => $position,
                ],
            );

            foreach ($definition['cities'] as $name => $region) {
                City::updateOrCreate(
                    ['name' => $name],
                    ['delivery_zone_id' => $zone->id, 'region' => $region, 'is_active' => true],
                );
            }
        }
    }
}
