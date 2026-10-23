<?php

namespace Database\Seeders;

use App\Enums\InventoryReason;
use App\Enums\PackEligibility;
use App\Enums\PackPricing;
use App\Enums\PackType;
use App\Enums\ProductStatus;
use App\Models\Collection;
use App\Models\FragranceFamily;
use App\Models\Pack;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\Inventory\InventoryManager;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * A demo catalogue so the storefront can be explored before the real one is entered.
 * Its collections, perfume names, prices and published pyramids are inspired by the
 * catalogue of Les Parfums d'Igor (lesparfumsdigor.com); the other notes and every
 * text are written for this demo, and prices are converted to dirhams. Every record
 * is flagged `is_demo`; the storefront announcement says the products are fictitious
 * and the dashboard checklist asks for their replacement. The artwork in
 * public/images/demo is drawn after the house's own bottle and tube, not taken
 * from the brand.
 * Safe to run twice: existing slugs are skipped.
 */
class DemoCatalogSeeder extends Seeder
{
    private const EXTRAIT = 'Extrait de parfum';

    private const LINGE = 'Parfum de linge';

    private const FAMILIES = [
        'oriental' => ['Oriental', 'Ambre, encens, vanille et épices : des sillages chauds et envoûtants.'],
        'floral' => ['Floral', 'Rose, jasmin, pivoine et fleurs blanches, sous toutes leurs lumières.'],
        'gourmand' => ['Gourmand', 'Vanille, praliné, caramel et coco : des parfums qui se dégustent.'],
        'fruite' => ['Fruité', 'Fruits juteux et notes pétillantes : l’énergie à l’état pur.'],
        'boise' => ['Boisé', 'Cèdre, santal, vétiver et bois précieux : la structure et l’élégance du bois.'],
        'musque' => ['Musqué', 'Muscs blancs et notes poudrées : le parfum comme une seconde peau.'],
        'frais' => ['Frais', 'Agrumes, notes marines et aromatiques : la vivacité d’un matin d’été.'],
    ];

    private const COLLECTIONS = [
        'collection-privee' => [
            'name' => 'Collection Privée',
            'tagline' => 'L’exclusivité enfin accessible.',
            'description' => 'Nos créations signature en extrait de parfum, de l’emblématique Aïsha au best-seller Crystal 24 : des flacons ciselés comme des bijoux, pour tous les caractères.',
            'accent_color' => '#E59AB0',
            'is_featured' => true,
        ],
        'collection-classique' => [
            'name' => 'Collection Classique',
            'tagline' => 'Les grands classiques, revisités.',
            'description' => 'Des compositions intemporelles, d’inspiration orientale, boisée ou aromatique : la signature de la maison au quotidien.',
            'accent_color' => '#D9B25C',
            'is_featured' => false,
        ],
        'edition-collector' => [
            'name' => 'Édition Collector',
            'tagline' => 'Nos best-sellers en flacons d’exception.',
            'description' => 'Grands formats de 75 et 100 ml aux finitions dorées : nos parfums emblématiques dans une version précieuse, produite en série limitée.',
            'accent_color' => '#C9A24D',
            'is_featured' => false,
        ],
        'sprays' => [
            'name' => 'Sprays',
            'tagline' => 'Parfums de linge et d’intérieur.',
            'description' => 'Des brumes de 250 ml pour parfumer textiles, linge de maison et intérieurs avec les accords de la maison.',
            'accent_color' => '#8DB4E2',
            'is_featured' => false,
        ],
    ];

    /**
     * Variants: [size_ml, price in DH, stock]. `published` is the date the perfume
     * entered the catalogue, which gives the "newest" sort its order. Products with a
     * single image (the sprays) have no box to show.
     *
     * @var list<array<string, mixed>>
     */
    private const PRODUCTS = [
        [
            'slug' => 'aisha', 'name' => 'Aïsha', 'family' => 'oriental', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#D9BE6A', 'longevity' => 5, 'sillage' => 4, 'featured' => true, 'badge' => 'bestseller', 'published' => '2024-11-19',
            'collections' => ['collection-privee'],
            'tagline' => 'La création emblématique de la maison, orientale et florale.',
            'description' => 'Née en 2016, Aïsha est la signature de la maison. Le safran et la bergamote éclairent un cœur de rose et de jasmin, posé sur un fond d’ambre, de vanille et de musc : un oriental floral profond et doux, de caractère mais résolument moderne.',
            'inspiration' => 'Le premier flacon de la maison, imaginé comme une invitation au voyage : un parfum universel, assez profond pour les amateurs de sillages affirmés, assez doux pour se porter chaque jour.',
            'notes' => ['top' => ['Safran', 'Bergamote'], 'heart' => ['Rose', 'Jasmin'], 'base' => ['Ambre', 'Vanille', 'Musc']],
            'variants' => [[50, 540, 40]],
        ],
        [
            'slug' => 'muskitoko-musc-blanc', 'name' => 'Muskitoko Musc Blanc', 'family' => 'musque', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#C9935F', 'longevity' => 4, 'sillage' => 3, 'featured' => true, 'badge' => 'bestseller', 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'Un musc blanc pur, rehaussé d’agrumes.',
            'description' => 'Muskitoko Musc Blanc marie deux familles fortes : la douceur des muscs blancs et l’éclat des agrumes. Bergamote et citron s’ouvrent sur la fleur de coton et le muguet, avant un fond de musc blanc et d’ambrette, simple, propre et sophistiqué.',
            'inspiration' => 'Le parfum des valeurs sûres : celui qu’on porte sans y penser, du matin au soir, et qu’on vous réclame dès que vous l’oubliez.',
            'notes' => ['top' => ['Bergamote', 'Citron'], 'heart' => ['Fleur de coton', 'Muguet'], 'base' => ['Musc blanc', 'Ambrette']],
            'variants' => [[50, 540, 36]],
        ],
        [
            'slug' => 'crystal-24', 'name' => 'Crystal 24', 'family' => 'floral', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#E79BB2', 'longevity' => 4, 'sillage' => 4, 'featured' => true, 'badge' => 'bestseller', 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'Un floral musqué cristallin, le best-seller qui fait l’unanimité.',
            'description' => 'Crystal 24 est une ode à la transparence : les fruits rouges et la poire pétillent sur un cœur de rose et de pivoine, avant un fond de musc blanc et de vanille. Une fragrance douce et puissante à la fois, d’une fraîcheur lumineuse, pour toutes les saisons.',
            'inspiration' => 'L’éclat d’un cristal sous la lumière : une fragrance pensée pour sublimer l’aura de celles et ceux qui la portent.',
            'notes' => ['top' => ['Fruits rouges', 'Poire'], 'heart' => ['Rose', 'Pivoine'], 'base' => ['Musc blanc', 'Vanille']],
            'variants' => [[50, 540, 30]],
        ],
        [
            'slug' => 'midnight-luv', 'name' => 'Midnight Luv', 'family' => 'floral', 'concentration' => self::EXTRAIT, 'gender' => 'feminin',
            'accent' => '#9B8FB8', 'longevity' => 4, 'sillage' => 4, 'featured' => true, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'Un floral oriental pour l’heure où le jour cède à la nuit.',
            'description' => 'Midnight Luv mêle des accords fruités, floraux et boisés : le cassis et la poire ouvrent sur le jasmin et la fleur d’oranger, avant un fond de patchouli, de vanille et de cèdre. Un parfum de caractère, mystérieux et élégant, pour les esprits audacieux et romantiques.',
            'inspiration' => 'Ces instants précieux où le jour laisse place à la nuit, quand tout devient possible.',
            'notes' => ['top' => ['Cassis', 'Poire'], 'heart' => ['Jasmin', 'Fleur d’oranger'], 'base' => ['Patchouli', 'Vanille', 'Cèdre']],
            'variants' => [[50, 540, 22]],
        ],
        [
            'slug' => 'blue-magic', 'name' => 'Blue Magic', 'family' => 'fruite', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#7C82DB', 'longevity' => 4, 'sillage' => 4, 'featured' => true, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'Une vague fruitée et florale, fraîche et étonnamment douce.',
            'description' => 'Blue Magic allie des notes fruitées, florales et vanillées dans un équilibre maîtrisé : la pomme et la bergamote, la fleur de lotus et le jasmin, puis la vanille et le musc. Un parfum puissant et frais, mais étonnamment doux, qui déferle sur les sens comme une vague.',
            'inspiration' => 'Une évasion vers des rivages lointains, portée par la fraîcheur des fruits et la douceur de la vanille.',
            'notes' => ['top' => ['Pomme', 'Bergamote'], 'heart' => ['Fleur de lotus', 'Jasmin'], 'base' => ['Vanille', 'Musc']],
            'variants' => [[50, 540, 28]],
        ],
        [
            'slug' => 'sweet-dreams', 'name' => 'Sweet Dreams', 'family' => 'gourmand', 'concentration' => self::EXTRAIT, 'gender' => 'feminin',
            'accent' => '#E6A2B5', 'longevity' => 4, 'sillage' => 3, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'Un gourmand floral, doux comme un rêve éveillé.',
            'description' => 'Sweet Dreams marie accords gourmands et floraux : la framboise et la mandarine, la fleur d’oranger et le jasmin, puis un fond de praliné, de vanille et de musc. Une aura chaleureuse et réconfortante, qui captive sans s’imposer.',
            'inspiration' => 'La sérénité d’un rêve éveillé, un dimanche matin, enveloppé dans une couverture douce.',
            'notes' => ['top' => ['Framboise', 'Mandarine'], 'heart' => ['Fleur d’oranger', 'Jasmin'], 'base' => ['Praliné', 'Vanille', 'Musc']],
            'variants' => [[50, 540, 20]],
        ],
        [
            'slug' => 'fleur-gourmande', 'name' => 'Fleur Gourmande', 'family' => 'gourmand', 'concentration' => self::EXTRAIT, 'gender' => 'feminin',
            'accent' => '#E89FAE', 'longevity' => 4, 'sillage' => 4, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'La fraîcheur des fleurs, la gourmandise du sucre.',
            'description' => 'Fleur Gourmande unit la fraîcheur florale à des nuances sucrées et onctueuses : la poire et la bergamote, la rose et la pivoine, puis le caramel, la vanille et le musc. Un parfum gourmand mais élégant, au sillage chaleureux, absolument addictif.',
            'inspiration' => 'Une pâtisserie fleurie à la rose et à la vanille, qui attire inévitablement les compliments.',
            'notes' => ['top' => ['Poire', 'Bergamote'], 'heart' => ['Rose', 'Pivoine'], 'base' => ['Caramel', 'Vanille', 'Musc']],
            'variants' => [[50, 540, 18]],
        ],
        [
            'slug' => 'rose-vanille', 'name' => 'Rose Vanille', 'family' => 'gourmand', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#E5A3AC', 'longevity' => 4, 'sillage' => 4, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'La rose et la vanille, gourmandes et florales.',
            'description' => 'Rose Vanille allie la fraîcheur du citron et de la bergamote à une rose turque poudrée de sucre, posée sur un fond de vanille, de cèdre et de musc blanc. Un parfum mixte, chaleureux, qui convient à tous les âges et à toutes les occasions.',
            'inspiration' => 'Une rose poudrée de sucre vanillé : un grand classique gourmand, revisité avec la touche de la maison.',
            'notes' => ['top' => ['Citron', 'Bergamote'], 'heart' => ['Rose turque', 'Sucre'], 'base' => ['Vanille', 'Cèdre', 'Musc blanc']],
            'variants' => [[50, 540, 26]],
        ],
        [
            'slug' => 'love-coco', 'name' => 'Love Coco', 'family' => 'gourmand', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#E3D2A8', 'longevity' => 4, 'sillage' => 3, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'Une escapade tropicale, gourmande et exotique.',
            'description' => 'Love Coco capture l’essence d’une escapade sous les tropiques : la noix de coco et la bergamote s’ouvrent sur la fleur de tiaré et le jasmin, avant un fond de vanille, de fève tonka et de musc. Un gourmand exotique, chaleureux et élégant.',
            'inspiration' => 'Un paysage luxuriant et apaisant : le sable chaud, l’ombre des cocotiers et la chaleur douce des tropiques.',
            'notes' => ['top' => ['Noix de coco', 'Bergamote'], 'heart' => ['Fleur de tiaré', 'Jasmin'], 'base' => ['Vanille', 'Fève tonka', 'Musc']],
            'variants' => [[50, 590, 16]],
        ],
        [
            'slug' => 'ghost', 'name' => 'Ghost', 'family' => 'boise', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#B9BEC4', 'longevity' => 4, 'sillage' => 3, 'featured' => false, 'badge' => null, 'published' => '2025-06-29',
            'collections' => ['collection-privee'],
            'tagline' => 'Un boisé ambré énigmatique, aussi léger qu’envoûtant.',
            'description' => 'Ghost mêle notes aériennes et profondes : la bergamote et le poivre rose, la lavande et l’iris, puis un fond d’ambre gris, de cèdre et de musc. Un parfum délicat mais marquant, pour captiver sans se dévoiler entièrement, de jour comme de soir.',
            'inspiration' => 'L’évanescence et le charme de l’inconnu : une présence subtile, qu’on devine plus qu’on ne la voit.',
            'notes' => ['top' => ['Bergamote', 'Poivre rose'], 'heart' => ['Lavande', 'Iris'], 'base' => ['Ambre gris', 'Cèdre', 'Musc']],
            'variants' => [[50, 590, 14]],
        ],
        [
            'slug' => 'super-fleurs', 'name' => 'Super Fleurs', 'family' => 'floral', 'concentration' => self::EXTRAIT, 'gender' => 'feminin',
            'accent' => '#D8C84A', 'longevity' => 3, 'sillage' => 4, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'Un bouquet vibrant, frais et lumineux.',
            'description' => 'Super Fleurs associe des fleurs opulentes à des nuances fraîches et boisées : la mandarine et la poire, un bouquet de jasmin, de tubéreuse et de fleur d’oranger, puis le patchouli et le musc. Une signature florale moderne, pleine de vitalité, pour toutes les saisons.',
            'inspiration' => 'L’énergie éclatante d’un jardin en pleine floraison, un matin de printemps.',
            'notes' => ['top' => ['Mandarine', 'Poire'], 'heart' => ['Jasmin', 'Tubéreuse', 'Fleur d’oranger'], 'base' => ['Patchouli', 'Musc']],
            'variants' => [[50, 540, 20]],
        ],
        [
            'slug' => 'u-wanna-be-me', 'name' => 'U Wanna Be Me', 'family' => 'oriental', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#E2CB4A', 'longevity' => 5, 'sillage' => 4, 'featured' => true, 'badge' => 'new', 'published' => '2025-11-26',
            'collections' => ['collection-privee'],
            'tagline' => 'Encens, benjoin et vanille : un sillage qu’on vous envie.',
            'description' => 'Une bergamote lumineuse ouvre sur un cœur d’encens, d’amyris, de benjoin et de violette. Le fond de vanille, de santal indien, de musc et d’ambre signe un oriental profond, chaleureux et magnétique.',
            'inspiration' => 'Le parfum qu’on vous demande dans la rue : celui qui fait se retourner, et donne envie d’être vous.',
            'notes' => ['top' => ['Bergamote'], 'heart' => ['Encens', 'Amyris', 'Benjoin', 'Violette'], 'base' => ['Vanille', 'Santal indien', 'Musc', 'Ambre']],
            'variants' => [[50, 540, 24]],
        ],
        [
            'slug' => 'akoya-musc', 'name' => 'Akoya Musc', 'family' => 'musque', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#CFC8BE', 'longevity' => 4, 'sillage' => 3, 'featured' => false, 'badge' => null, 'published' => '2025-08-05',
            'collections' => ['collection-privee'],
            'tagline' => 'Un musc nacré, muguet et cashmeran.',
            'description' => 'Akoya Musc s’ouvre sur l’accord Muskitoko de la maison, avant un cœur de muguet, de cashmeran et de musc. L’ambre et le musc prolongent ce sillage doux et nacré, comme une seconde peau.',
            'inspiration' => 'L’éclat discret d’une perle d’Akoya : une lumière douce et précieuse, qui se révèle au plus près de la peau.',
            'notes' => ['top' => ['Accord Muskitoko'], 'heart' => ['Muguet', 'Cashmeran', 'Musc'], 'base' => ['Ambre', 'Musc']],
            'variants' => [[50, 540, 22]],
        ],
        [
            'slug' => 'medellin', 'name' => 'Medellin', 'family' => 'boise', 'concentration' => self::EXTRAIT, 'gender' => 'masculin',
            'accent' => '#E9AE84', 'longevity' => 4, 'sillage' => 4, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'La fraîcheur urbaine, la chaleur des bois épicés.',
            'description' => 'Medellin célèbre les contrastes : la fraîcheur du pamplemousse et de la cardamome rencontre la profondeur du poivre noir et de la lavande, avant un fond de vétiver, de cèdre et d’ambre. Une fragrance intense et intrigante, pour affirmer son caractère tout en subtilité.',
            'inspiration' => 'La dualité d’une ville vibrante et de ses paysages exotiques, entre énergie urbaine et nature luxuriante.',
            'notes' => ['top' => ['Pamplemousse', 'Cardamome'], 'heart' => ['Poivre noir', 'Lavande'], 'base' => ['Vétiver', 'Cèdre', 'Ambre']],
            'variants' => [[50, 540, 18]],
        ],
        [
            'slug' => 'jungle', 'name' => 'Jungle', 'family' => 'boise', 'concentration' => self::EXTRAIT, 'gender' => 'masculin',
            'accent' => '#E0C06A', 'longevity' => 4, 'sillage' => 5, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'La puissance brute des forêts tropicales.',
            'description' => 'Jungle capture l’essence de la nature dans toute sa splendeur : le citron vert et le gingembre, les feuilles vertes et le géranium, puis un fond de patchouli, de vétiver et de mousse de chêne. Un boisé audacieux et énergique, au sillage puissant.',
            'inspiration' => 'La richesse et la force des forêts tropicales, leur végétation dense et leur état sauvage.',
            'notes' => ['top' => ['Citron vert', 'Gingembre'], 'heart' => ['Feuilles vertes', 'Géranium'], 'base' => ['Patchouli', 'Vétiver', 'Mousse de chêne']],
            'variants' => [[50, 540, 15]],
        ],
        [
            'slug' => 'pegaz', 'name' => 'Pegaz', 'family' => 'boise', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#B29BE0', 'longevity' => 5, 'sillage' => 4, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'Fraîcheur et caractère boisé, dans la lignée des grands classiques.',
            'description' => 'Pegaz allie fraîcheur et caractère boisé : la bergamote et l’amande, la lavande, l’héliotrope et le jasmin, puis un fond de vanille, de santal et d’ambre. Un extrait de parfum longue tenue, pour elle comme pour lui, du quotidien aux occasions spéciales.',
            'inspiration' => 'Le cheval ailé des légendes : une interprétation contemporaine et accessible des grands parfums, entre tradition et modernité.',
            'notes' => ['top' => ['Bergamote', 'Amande'], 'heart' => ['Lavande', 'Héliotrope', 'Jasmin'], 'base' => ['Vanille', 'Santal', 'Ambre']],
            'variants' => [[50, 540, 20]],
        ],
        [
            'slug' => 'avts', 'name' => 'AVTS', 'family' => 'fruite', 'concentration' => self::EXTRAIT, 'gender' => 'masculin',
            'accent' => '#CDBE9C', 'longevity' => 5, 'sillage' => 4, 'featured' => true, 'badge' => 'new', 'published' => '2026-03-09',
            'collections' => ['collection-privee'],
            'tagline' => 'Un fruité boisé conquérant, ananas et bouleau.',
            'description' => 'AVTS s’ouvre sur l’éclat juteux de l’ananas, de la bergamote et de la pomme. Au cœur, le bouleau fumé et le jasmin dessinent une élégance assurée, avant un fond de musc, de mousse de chêne et d’ambre gris.',
            'inspiration' => 'Le parfum des conquérants : une signature fraîche et fumée, pour celles et ceux qui vont de l’avant.',
            'notes' => ['top' => ['Ananas', 'Bergamote', 'Pomme'], 'heart' => ['Bouleau', 'Jasmin'], 'base' => ['Musc', 'Mousse de chêne', 'Ambre gris']],
            'variants' => [[50, 540, 30]],
        ],
        [
            'slug' => 'rose-d-orient', 'name' => 'Rose d’Orient', 'family' => 'floral', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#E8B48E', 'longevity' => 5, 'sillage' => 4, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-privee'],
            'tagline' => 'La majesté de la rose, sublimée d’accords orientaux.',
            'description' => 'Rose d’Orient dévoile la beauté et la profondeur de la rose de Damas, éveillée par le safran et la bergamote, relevée de géranium, puis posée sur un fond d’oud, d’ambre et de patchouli. Une composition intense et douce, entre tradition orientale et modernité.',
            'inspiration' => 'Les paysages mystiques de l’Orient, ses jardins de roses et ses bois précieux.',
            'notes' => ['top' => ['Safran', 'Bergamote'], 'heart' => ['Rose de Damas', 'Géranium'], 'base' => ['Oud', 'Ambre', 'Patchouli']],
            'variants' => [[50, 540, 16]],
        ],
        [
            'slug' => 'juicy', 'name' => 'Juicy', 'family' => 'fruite', 'concentration' => self::EXTRAIT, 'gender' => 'feminin',
            'accent' => '#E0D468', 'longevity' => 3, 'sillage' => 4, 'featured' => false, 'badge' => 'new', 'published' => '2025-12-15',
            'collections' => ['collection-privee'],
            'tagline' => 'Un fruité pétillant, juteux et plein d’énergie.',
            'description' => 'Juicy croque dans les fruits mûrs : la mandarine, la poire et les fruits rouges pétillent sur un cœur de fleur d’oranger et de jasmin, avant un fond de musc et de vanille légère. Un parfum joyeux et solaire, à porter sans modération.',
            'inspiration' => 'Un jus de fruits pressés au soleil, en terrasse, quand l’été ne fait que commencer.',
            'notes' => ['top' => ['Mandarine', 'Poire', 'Fruits rouges'], 'heart' => ['Fleur d’oranger', 'Jasmin'], 'base' => ['Musc', 'Vanille']],
            'variants' => [[50, 540, 32]],
        ],
        [
            'slug' => 'jumeirah-beach', 'name' => 'Jumeirah Beach', 'family' => 'oriental', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#E2BE72', 'longevity' => 5, 'sillage' => 4, 'featured' => true, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-classique'],
            'tagline' => 'Safran, rose et patchouli sur la plage de Dubaï.',
            'description' => 'Le safran et la fraîcheur du citron s’unissent à la rose, avant un fond de patchouli et de vanille. Un oriental aromatique, léger et délicat le jour, riche et sensuel le soir.',
            'inspiration' => 'Une promenade le long de la plage de Jumeirah, à Dubaï : le soleil sur la peau et l’air chargé de senteurs enivrantes.',
            'notes' => ['top' => ['Safran', 'Citron'], 'heart' => ['Rose'], 'base' => ['Patchouli', 'Vanille']],
            'variants' => [[50, 540, 20]],
        ],
        [
            'slug' => 'couleur-d-ebene', 'name' => 'Couleur d’Ébène', 'family' => 'oriental', 'concentration' => self::EXTRAIT, 'gender' => 'masculin',
            'accent' => '#DDA93C', 'longevity' => 5, 'sillage' => 5, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-classique'],
            'tagline' => 'Agrumes, fleurs poivrées et bois puissants.',
            'description' => 'La bergamote et le citron en tête, un cœur de jasmin relevé de poivre rose, puis de puissantes notes d’oud, de santal et d’ambre : Couleur d’Ébène est une véritable signature de caractère, à la tenue exceptionnelle.',
            'inspiration' => 'La profondeur et l’éclat d’un bois d’ébène poli, sombre et lumineux à la fois.',
            'notes' => ['top' => ['Bergamote', 'Citron'], 'heart' => ['Jasmin', 'Poivre rose'], 'base' => ['Oud', 'Santal', 'Ambre']],
            'variants' => [[50, 540, 18]],
        ],
        [
            'slug' => 'skys-the-limit', 'name' => 'Sky’s the Limit', 'family' => 'frais', 'concentration' => self::EXTRAIT, 'gender' => 'masculin',
            'accent' => '#A8C0D6', 'longevity' => 4, 'sillage' => 3, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-classique'],
            'tagline' => 'Frais et boisé, pour ceux qui osent rêver grand.',
            'description' => 'Sky’s the Limit célèbre l’ambition et la liberté : le pamplemousse et la bergamote, la lavande et le géranium, puis un fond de cèdre, de vétiver et d’ambroxan. Une signature fraîche et moderne, à la tenue exceptionnelle, pour se dépasser au quotidien.',
            'inspiration' => 'L’énergie, la détermination et la quête de l’excellence : le ciel pour seule limite.',
            'notes' => ['top' => ['Pamplemousse', 'Bergamote'], 'heart' => ['Lavande', 'Géranium'], 'base' => ['Cèdre', 'Vétiver', 'Ambroxan']],
            'variants' => [[50, 540, 22]],
        ],
        [
            'slug' => 'hayat-intense', 'name' => 'Hayat Intense', 'family' => 'oriental', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#C9A227', 'longevity' => 5, 'sillage' => 5, 'featured' => false, 'badge' => 'new', 'published' => '2025-12-04',
            'collections' => ['collection-classique'],
            'tagline' => 'Un oriental intense, doré et vibrant.',
            'description' => 'Hayat, « la vie » en arabe, déploie un oriental doré et généreux : le safran et la bergamote éclairent un cœur de rose et de jasmin, posé sur un fond d’ambre, d’oud et de vanille. Une version intense, au sillage puissant.',
            'inspiration' => 'Une célébration de la vie, de ses fêtes et de ses éclats d’or.',
            'notes' => ['top' => ['Safran', 'Bergamote'], 'heart' => ['Rose', 'Jasmin'], 'base' => ['Ambre', 'Oud', 'Vanille']],
            'variants' => [[50, 590, 18]],
        ],
        [
            'slug' => '23', 'name' => '23', 'family' => 'floral', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#D8CC96', 'longevity' => 4, 'sillage' => 3, 'featured' => false, 'badge' => null, 'published' => '2025-12-04',
            'collections' => ['collection-classique'],
            'tagline' => 'Un floral poudré, chic et intemporel.',
            'description' => 'Sobre comme son nom, 23 mise sur l’élégance : les aldéhydes et la bergamote ouvrent sur un cœur d’iris et de jasmin, posé sur un fond de musc blanc et de santal. Un floral poudré, chic et intemporel.',
            'inspiration' => 'Un chiffre pour signature : le parfum épuré de celles et ceux qui n’ont rien à prouver.',
            'notes' => ['top' => ['Aldéhydes', 'Bergamote'], 'heart' => ['Iris', 'Jasmin'], 'base' => ['Musc blanc', 'Santal']],
            'variants' => [[50, 590, 20]],
        ],
        [
            'slug' => 'un-mec-mortel', 'name' => 'Un Mec Mortel', 'family' => 'oriental', 'concentration' => self::EXTRAIT, 'gender' => 'masculin',
            'accent' => '#B98A4E', 'longevity' => 5, 'sillage' => 5, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-classique'],
            'tagline' => 'Boisé, épicé, ambré : un sillage magnétique.',
            'description' => 'Conçu pour les personnalités fortes, Un Mec Mortel entrelace la cardamome et la lavande, la cannelle et l’iris, puis un fond d’ambre, de fève tonka et de cèdre. Un ambré aromatique dynamique et sophistiqué, du quotidien aux soirées marquantes.',
            'inspiration' => 'La confiance et l’audace de celui qui entre dans une pièce et qu’on n’oublie plus.',
            'notes' => ['top' => ['Cardamome', 'Lavande'], 'heart' => ['Cannelle', 'Iris'], 'base' => ['Ambre', 'Fève tonka', 'Cèdre']],
            'variants' => [[50, 540, 0]],
        ],
        [
            'slug' => 'dubai-marina', 'name' => 'Dubai Marina', 'family' => 'frais', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#5B8FB4', 'longevity' => 4, 'sillage' => 4, 'featured' => false, 'badge' => null, 'published' => '2025-12-04',
            'collections' => ['collection-classique'],
            'tagline' => 'Les lumières de la marina, fraîches et ambrées.',
            'description' => 'Dubai Marina mêle la fraîcheur de la bergamote et des notes marines à la lavande et à la sauge, avant un fond d’ambre gris, de cèdre et de musc. Un parfum élégant et lumineux, comme une soirée au bord de l’eau.',
            'inspiration' => 'Le coucher du soleil sur la marina de Dubaï, quand les tours s’illuminent et que la brise du Golfe se lève.',
            'notes' => ['top' => ['Bergamote', 'Notes marines'], 'heart' => ['Lavande', 'Sauge'], 'base' => ['Ambre gris', 'Cèdre', 'Musc']],
            'variants' => [[50, 590, 20]],
        ],
        [
            'slug' => 'chavez', 'name' => 'Chavez', 'family' => 'boise', 'concentration' => self::EXTRAIT, 'gender' => 'masculin',
            'accent' => '#C8B46A', 'longevity' => 4, 'sillage' => 4, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-classique'],
            'tagline' => 'Un boisé poudré et aromatique, puissant et raffiné.',
            'description' => 'Chavez mêle accords boisés et épicés en une composition audacieuse : la bergamote et le poivre noir, la douceur poudrée de l’iris et de la lavande, puis la profondeur du vétiver, du cèdre et de la fève tonka. Un hymne à l’audace, pour les personnalités affirmées.',
            'inspiration' => 'La force intérieure et la détermination, exprimées avec élégance.',
            'notes' => ['top' => ['Bergamote', 'Poivre noir'], 'heart' => ['Iris', 'Lavande'], 'base' => ['Vétiver', 'Cèdre', 'Fève tonka']],
            'variants' => [[50, 540, 20]],
        ],
        [
            'slug' => 'comme-un-eclat', 'name' => 'Comme un Éclat', 'family' => 'frais', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#F0AE78', 'longevity' => 3, 'sillage' => 3, 'featured' => false, 'badge' => null, 'published' => '2024-06-28',
            'collections' => ['collection-classique'],
            'tagline' => 'Un éclat de lumière, frais, fruité et boisé.',
            'description' => 'Comme un Éclat allie la mandarine et le pamplemousse à la pêche et à la fleur d’oranger, sur un fond de cèdre et de musc : une signature lumineuse et intemporelle, qui apporte une touche de lumière en été comme en hiver.',
            'inspiration' => 'La brillance et la pureté d’un éclat de lumière, qui illumine chaque instant.',
            'notes' => ['top' => ['Mandarine', 'Pamplemousse'], 'heart' => ['Pêche', 'Fleur d’oranger'], 'base' => ['Cèdre', 'Musc']],
            'variants' => [[50, 540, 24]],
        ],
        [
            'slug' => 'aisha-edition-or', 'name' => 'Aïsha Édition Or', 'family' => 'oriental', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#C9A24D', 'longevity' => 5, 'sillage' => 5, 'featured' => true, 'badge' => 'limited', 'published' => '2024-12-06',
            'collections' => ['edition-collector'],
            'tagline' => 'Aïsha, plus intense, en flacon de 75 ml aux finitions dorées.',
            'description' => 'Une version précieuse de la création emblématique de la maison : la fragrance d’Aïsha, à l’intensité plus marquée, dans un flacon de 75 ml habillé d’or, de la plaque à la bague. Une édition limitée pour les instants mémorables.',
            'inspiration' => 'Le luxe et la sophistication d’Aïsha, magnifiés pour les grandes occasions.',
            'notes' => ['top' => ['Safran', 'Bergamote'], 'heart' => ['Rose', 'Jasmin'], 'base' => ['Ambre', 'Vanille', 'Musc']],
            'variants' => [[75, 1080, 8]],
        ],
        [
            'slug' => 'crystal-24-edition-collector', 'name' => 'Crystal 24 Édition Collector', 'family' => 'floral', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#E79BB2', 'longevity' => 4, 'sillage' => 4, 'featured' => false, 'badge' => 'limited', 'published' => '2025-10-15',
            'collections' => ['edition-collector'],
            'tagline' => 'Le best-seller Crystal 24 en flacon collector de 100 ml.',
            'description' => 'Crystal 24, la fragrance qui fait l’unanimité, dans un flacon collector de 100 ml aux finitions dorées : les fruits rouges et la poire, la rose et la pivoine, puis un fond de musc blanc et de vanille, d’une fraîcheur cristalline.',
            'inspiration' => 'Le best-seller de la maison, habillé pour durer : un grand format à garder sur sa coiffeuse.',
            'notes' => ['top' => ['Fruits rouges', 'Poire'], 'heart' => ['Rose', 'Pivoine'], 'base' => ['Musc blanc', 'Vanille']],
            'variants' => [[100, 860, 10]],
        ],
        [
            'slug' => 'muskitoko-edition-collector', 'name' => 'Muskitoko Édition Collector', 'family' => 'musque', 'concentration' => self::EXTRAIT, 'gender' => 'mixte',
            'accent' => '#CFCFC6', 'longevity' => 4, 'sillage' => 3, 'featured' => false, 'badge' => 'limited', 'published' => '2025-10-15',
            'collections' => ['edition-collector'],
            'tagline' => 'Le musc blanc de la maison en flacon collector de 100 ml.',
            'description' => 'Muskitoko dans un flacon collector de 100 ml aux finitions dorées : la pureté des muscs blancs et l’éclat des agrumes, une composition simple et sophistiquée à porter en toutes occasions.',
            'inspiration' => 'Une valeur sûre, en grand format : pour ne plus jamais en manquer.',
            'notes' => ['top' => ['Bergamote', 'Citron'], 'heart' => ['Fleur de coton', 'Muguet'], 'base' => ['Musc blanc', 'Ambrette']],
            'variants' => [[100, 860, 10]],
        ],
        [
            'slug' => 'spray-aisha', 'name' => 'Spray Aïsha', 'family' => 'oriental', 'concentration' => self::LINGE, 'gender' => null,
            'accent' => '#D8B6A6', 'longevity' => null, 'sillage' => null, 'featured' => false, 'badge' => null, 'published' => '2024-06-28', 'images' => 1,
            'collections' => ['sprays'],
            'tagline' => 'Les accords floraux et orientaux d’Aïsha, pour la maison.',
            'description' => 'Une brume légère et durable qui parfume rideaux, coussins, linge de maison et pièces avec les accords floraux et orientaux d’Aïsha. Vaporisez à environ 20 cm des textiles, ou dans l’air avant de recevoir.',
            'inspiration' => null,
            'notes' => ['top' => ['Bergamote'], 'heart' => ['Rose', 'Jasmin'], 'base' => ['Ambre', 'Vanille']],
            'variants' => [[250, 140, 30]],
        ],
        [
            'slug' => 'spray-cotton-virgo', 'name' => 'Spray Cotton Virgo', 'family' => 'musque', 'concentration' => self::LINGE, 'gender' => null,
            'accent' => '#D6C6B0', 'longevity' => null, 'sillage' => null, 'featured' => false, 'badge' => null, 'published' => '2024-06-28', 'images' => 1,
            'collections' => ['sprays'],
            'tagline' => 'La douceur poudrée d’un linge fraîchement lavé.',
            'description' => 'Spray Cotton Virgo capture la légèreté du coton et l’élégance des notes poudrées et musquées. Une brume douce pour vos tissus et intérieurs, qui évoque la propreté et le confort d’un linge propre.',
            'inspiration' => null,
            'notes' => ['top' => ['Aldéhydes'], 'heart' => ['Fleur de coton'], 'base' => ['Musc blanc', 'Notes poudrées']],
            'variants' => [[250, 140, 30]],
        ],
        [
            'slug' => 'fresh-spray', 'name' => 'Fresh Spray', 'family' => 'frais', 'concentration' => self::LINGE, 'gender' => null,
            'accent' => '#8CC8D4', 'longevity' => null, 'sillage' => null, 'featured' => false, 'badge' => null, 'published' => '2024-06-28', 'images' => 1,
            'collections' => ['sprays'],
            'tagline' => 'Une fraîcheur douce pour le linge et les vêtements.',
            'description' => 'Fresh Spray offre à vos linges et vêtements une fraîcheur douce et prenante, qui rend le contact avec vos textiles d’autant plus agréable.',
            'inspiration' => null,
            'notes' => ['top' => ['Citron', 'Notes marines'], 'heart' => ['Muguet'], 'base' => ['Musc blanc']],
            'variants' => [[250, 140, 30]],
        ],
        [
            'slug' => 'spray-blue-magic', 'name' => 'Spray Blue Magic', 'family' => 'frais', 'concentration' => self::LINGE, 'gender' => null,
            'accent' => '#8CB2E0', 'longevity' => null, 'sillage' => null, 'featured' => false, 'badge' => null, 'published' => '2024-06-28', 'images' => 1,
            'collections' => ['sprays'],
            'tagline' => 'Une brise marine, aquatique et boisée, pour la maison.',
            'description' => 'Spray Blue Magic allie des accords aquatiques et boisés pour une atmosphère apaisante et vivifiante. Une brume légère qui rafraîchit rideaux, coussins et linge de maison.',
            'inspiration' => null,
            'notes' => ['top' => ['Notes marines', 'Bergamote'], 'heart' => ['Fleur de lotus'], 'base' => ['Cèdre', 'Musc']],
            'variants' => [[250, 140, 24]],
        ],
        [
            'slug' => 'spray-red-windows', 'name' => 'Spray Red Windows', 'family' => 'oriental', 'concentration' => self::LINGE, 'gender' => null,
            'accent' => '#D4505C', 'longevity' => null, 'sillage' => null, 'featured' => false, 'badge' => null, 'published' => '2024-06-28', 'images' => 1,
            'collections' => ['sprays'],
            'tagline' => 'Une atmosphère chaleureuse et sophistiquée.',
            'description' => 'Spray Red Windows enveloppe textiles et intérieurs d’un parfum chaleureux et raffiné, entre fruits rouges, rose épicée et ambre. Une brume légère et durable qui donne du caractère à chaque pièce.',
            'inspiration' => null,
            'notes' => ['top' => ['Fruits rouges'], 'heart' => ['Rose', 'Cannelle'], 'base' => ['Ambre', 'Vanille']],
            'variants' => [[250, 140, 20]],
        ],
        [
            'slug' => 'spray-holly-molly', 'name' => 'Spray Holly Molly', 'family' => 'fruite', 'concentration' => self::LINGE, 'gender' => null,
            'accent' => '#97C5BE', 'longevity' => null, 'sillage' => null, 'featured' => false, 'badge' => null, 'published' => '2024-06-28', 'images' => 1,
            'collections' => ['sprays'],
            'tagline' => 'Fleurs, fruits et une note gourmande de figue.',
            'description' => 'Spray Holly Molly allie accords floraux et fruités, sublimés par une note gourmande de figue. Une fraîcheur élégante et apaisante pour vos rideaux, canapés, draps et espaces.',
            'inspiration' => null,
            'notes' => ['top' => ['Figue', 'Poire'], 'heart' => ['Fleur de figuier', 'Jasmin'], 'base' => ['Musc', 'Cèdre']],
            'variants' => [[250, 140, 26]],
        ],
    ];

    public function __construct(private readonly InventoryManager $inventory) {}

    public function run(): void
    {
        DB::transaction(function () {
            $families = $this->families();
            $collections = $this->collections();

            foreach (self::PRODUCTS as $position => $definition) {
                $this->product($definition, $position, $families, $collections);
            }

            $this->packs($collections);
        });
    }

    /**
     * @return array<string, FragranceFamily>
     */
    private function families(): array
    {
        $families = [];
        $position = 0;

        foreach (self::FAMILIES as $slug => [$name, $description]) {
            $families[$slug] = FragranceFamily::updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'description' => $description, 'sort_order' => $position++],
            );
        }

        return $families;
    }

    /**
     * @return array<string, Collection>
     */
    private function collections(): array
    {
        $collections = [];
        $position = 0;

        foreach (self::COLLECTIONS as $slug => $attributes) {
            $collection = Collection::firstOrNew(['slug' => $slug]);
            $collection->fill([
                ...$attributes,
                'image_path' => "/images/demo/collection-{$slug}.svg",
                'is_visible' => true,
                'sort_order' => $position++,
            ]);
            $collection->forceFill(['is_demo' => true])->save();
            $collections[$slug] = $collection;
        }

        return $collections;
    }

    /**
     * @param  array<string, mixed>  $definition
     * @param  array<string, FragranceFamily>  $families
     * @param  array<string, Collection>  $collections
     */
    private function product(array $definition, int $position, array $families, array $collections): void
    {
        if (Product::withTrashed()->where('slug', $definition['slug'])->exists()) {
            return;
        }

        $product = new Product([
            'fragrance_family_id' => $families[$definition['family']]->id,
            'name' => $definition['name'],
            'slug' => $definition['slug'],
            'tagline' => $definition['tagline'],
            'description' => $definition['description'],
            'inspiration' => $definition['inspiration'],
            'concentration' => $definition['concentration'],
            'gender' => $definition['gender'],
            'longevity' => $definition['longevity'],
            'sillage' => $definition['sillage'],
            'status' => ProductStatus::Active,
            'is_featured' => $definition['featured'],
            'badge' => $definition['badge'],
            'accent_color' => $definition['accent'],
            'sort_order' => $position,
            'published_at' => $definition['published'],
        ]);
        $product->forceFill(['is_demo' => true])->save();

        foreach ($definition['variants'] as $index => [$size, $priceInDirhams, $stock]) {
            $variant = $product->variants()->create([
                'size_ml' => $size,
                'sku' => 'RP-'.strtoupper(str_replace('-', '', substr($definition['slug'], 0, 10))).'-'.$size,
                'price' => $priceInDirhams * 100,
                'low_stock_threshold' => 5,
                'is_active' => true,
                'sort_order' => $index,
            ]);

            if ($stock > 0) {
                $this->inventory->change($variant, $stock, InventoryReason::Initial, note: 'Stock de démonstration');
            }
        }

        $size = $definition['variants'][0][0];
        $images = [
            ['path' => "/images/demo/{$definition['slug']}-1.svg", 'alt' => "{$definition['name']}, flacon de {$size} ml", 'width' => 800, 'height' => 1000, 'sort_order' => 0],
            ['path' => "/images/demo/{$definition['slug']}-2.svg", 'alt' => "{$definition['name']} et son étui", 'width' => 800, 'height' => 1000, 'sort_order' => 1],
        ];
        $product->images()->createMany(array_slice($images, 0, $definition['images'] ?? 2));

        $product->syncNotes($definition['notes']);

        foreach ($definition['collections'] as $slug) {
            $collection = $collections[$slug];
            $collection->products()->attach($product->id, ['sort_order' => $collection->products()->count()]);
        }
    }

    /**
     * @param  array<string, Collection>  $collections
     */
    private function packs(array $collections): void
    {
        $this->pack('coffret-decouverte', [
            'name' => 'Coffret Découverte',
            'type' => PackType::Custom,
            'tagline' => 'Trois parfums au choix, en format 50 ml.',
            'description' => 'Composez votre trio parmi tous nos extraits de parfum en 50 ml : l’idéal pour explorer la maison, ou pour offrir.',
            'selection_count' => 3,
            'allowed_sizes' => [50],
            'eligibility' => PackEligibility::All,
            'allow_duplicates' => false,
            'pricing_type' => PackPricing::Percent,
            'discount_value' => 15,
            'sort_order' => 0,
        ]);

        $signature = $this->pack('trio-signature', [
            'name' => 'Trio Signature',
            'type' => PackType::Custom,
            'tagline' => 'Trois flacons de 50 ml, à prix doux.',
            'description' => 'Choisissez trois parfums en 50 ml parmi la Collection Privée et la Collection Classique.',
            'selection_count' => 3,
            'allowed_sizes' => [50],
            'eligibility' => PackEligibility::Collections,
            'allow_duplicates' => false,
            'pricing_type' => PackPricing::Fixed,
            'price' => 139000,
            'sort_order' => 1,
        ]);
        $signature?->eligibleCollections()->sync([$collections['collection-privee']->id, $collections['collection-classique']->id]);

        $bestSellers = $this->pack('coffret-best-sellers', [
            'name' => 'Coffret Best-sellers',
            'type' => PackType::Fixed,
            'tagline' => 'Les trois parfums qui font la renommée de la maison.',
            'description' => 'Aïsha, Crystal 24 et Muskitoko Musc Blanc : le trio de best-sellers composé par la maison, réuni dans un écrin.',
            'eligibility' => PackEligibility::All,
            'pricing_type' => PackPricing::Amount,
            'discount_value' => 20000,
            'sort_order' => 2,
        ]);

        if ($bestSellers !== null && $bestSellers->items()->doesntExist()) {
            foreach ([['aisha', 50], ['crystal-24', 50], ['muskitoko-musc-blanc', 50]] as $index => [$slug, $size]) {
                $variant = ProductVariant::query()
                    ->whereHas('product', fn ($query) => $query->where('slug', $slug))
                    ->where('size_ml', $size)
                    ->firstOrFail();

                $bestSellers->items()->create(['product_variant_id' => $variant->id, 'quantity' => 1, 'sort_order' => $index]);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function pack(string $slug, array $attributes): ?Pack
    {
        if (Pack::where('slug', $slug)->exists()) {
            return null;
        }

        $pack = new Pack([...$attributes, 'slug' => $slug, 'image_path' => "/images/demo/{$slug}.svg", 'is_active' => true]);
        $pack->forceFill(['is_demo' => true])->save();

        return $pack;
    }
}
