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
 * A fictional catalogue so the storefront can be explored before the real one is
 * entered. Every record is flagged `is_demo`; the storefront announcement says the
 * products are fictitious and the dashboard checklist asks for their replacement.
 * Artwork lives in public/images/demo. Safe to run twice: existing slugs are skipped.
 */
class DemoCatalogSeeder extends Seeder
{
    private const FAMILIES = [
        'ambre' => ['Ambré', 'Résines, vanille et épices : des sillages chauds qui enveloppent la peau.'],
        'boise' => ['Boisé', 'Cèdre, santal, vétiver et oud : la structure et l’élégance du bois.'],
        'floral' => ['Floral', 'Rose, jasmin et fleur d’oranger, sous toutes leurs lumières.'],
        'hesperide' => ['Hespéridé', 'Agrumes et aromates : la fraîcheur vive des matins d’été.'],
        'cuir' => ['Cuir', 'Cuir, tabac et notes fumées : le caractère avant tout.'],
        'musque' => ['Musqué', 'Muscs blancs et notes poudrées : le parfum comme une seconde peau.'],
    ];

    private const COLLECTIONS = [
        'nocturne' => [
            'name' => 'Nocturne',
            'tagline' => 'Les parfums de la nuit marocaine.',
            'description' => 'Ambres, cuirs et bois précieux : une collection pensée pour la nuit, ses lumières tamisées et ses rencontres.',
            'accent_color' => '#C9A46C',
            'is_featured' => true,
        ],
        'essentiels' => [
            'name' => 'Les Essentiels',
            'tagline' => 'Nos signatures, à porter chaque jour.',
            'description' => 'Des compositions lumineuses et faciles à vivre, de l’aube jusqu’au soir.',
            'accent_color' => '#B98A4E',
            'is_featured' => false,
        ],
        'jardins-de-medina' => [
            'name' => 'Jardins de Médina',
            'tagline' => 'Fleurs blanches, agrumes et menthe fraîche.',
            'description' => 'Une promenade dans les riads et les jardins secrets : la fraîcheur des fontaines, le parfum des fleurs et des agrumes.',
            'accent_color' => '#7FA88E',
            'is_featured' => false,
        ],
        'editions-rares' => [
            'name' => 'Éditions rares',
            'tagline' => 'Des extraits produits en petites séries.',
            'description' => 'Des matières d’exception travaillées en concentration extrait et produites en séries limitées.',
            'accent_color' => '#8E5A44',
            'is_featured' => false,
        ],
    ];

    /**
     * Variants: [size_ml, price in DH, stock].
     *
     * @var list<array<string, mixed>>
     */
    private const PRODUCTS = [
        [
            'slug' => 'nuit-d-ambre', 'name' => 'Nuit d’Ambre', 'family' => 'ambre', 'concentration' => 'Eau de parfum', 'gender' => 'mixte',
            'accent' => '#C68B3E', 'longevity' => 5, 'sillage' => 4, 'featured' => true, 'badge' => 'bestseller',
            'collections' => ['nocturne', 'essentiels'],
            'tagline' => 'Un ambre lumineux qui s’étire jusqu’à l’aube.',
            'description' => 'Nuit d’Ambre s’ouvre sur l’éclat de la bergamote et la chaleur poivrée de la cardamome. Au cœur, le labdanum et la rose de Damas tissent une étoffe dorée, avant qu’un fond d’ambre gris, de vanille bourbon et de benjoin ne s’installe pour la nuit.',
            'inspiration' => 'Les terrasses de Marrakech à l’heure où les lampes s’allument : la pierre encore tiède, l’odeur des résines qui brûlent dans les cours, et cette lumière ambrée qui adoucit tout.',
            'notes' => ['top' => ['Bergamote', 'Cardamome'], 'heart' => ['Labdanum', 'Rose de Damas'], 'base' => ['Ambre gris', 'Vanille bourbon', 'Benjoin']],
            'variants' => [[30, 490, 24], [50, 690, 18], [100, 990, 9]],
        ],
        [
            'slug' => 'oud-minuit', 'name' => 'Oud Minuit', 'family' => 'boise', 'concentration' => 'Extrait de parfum', 'gender' => 'mixte',
            'accent' => '#6E3B2A', 'longevity' => 5, 'sillage' => 5, 'featured' => true, 'badge' => 'limited',
            'collections' => ['nocturne', 'editions-rares'],
            'tagline' => 'Le bois précieux, révélé dans l’obscurité.',
            'description' => 'Un oud fumé et velouté, éclairé par le safran et le poivre rose. La rose turque en adoucit l’intensité tandis que le santal, le patchouli et une touche de cuir prolongent le sillage jusqu’au petit matin.',
            'inspiration' => 'Un salon tendu de velours, tard dans la nuit, où l’on fait brûler un éclat de bois d’agar pour honorer ses invités.',
            'notes' => ['top' => ['Safran', 'Poivre rose'], 'heart' => ['Oud', 'Rose turque'], 'base' => ['Santal', 'Patchouli', 'Cuir']],
            'variants' => [[50, 1290, 6], [100, 1890, 3]],
        ],
        [
            'slug' => 'fleur-de-medina', 'name' => 'Fleur de Médina', 'family' => 'floral', 'concentration' => 'Eau de parfum', 'gender' => 'feminin',
            'accent' => '#D9A0A6', 'longevity' => 3, 'sillage' => 3, 'featured' => true, 'badge' => 'new',
            'collections' => ['jardins-de-medina', 'essentiels'],
            'tagline' => 'La fleur d’oranger au cœur des ruelles blanches.',
            'description' => 'Une brassée de fleurs blanches cueillies à l’aube : le néroli et la mandarine pétillent, la fleur d’oranger et le jasmin sambac s’épanouissent, puis un voile de musc blanc et de miel vient caresser la peau.',
            'inspiration' => 'Les portes entrouvertes de la médina de Tétouan, d’où s’échappe le parfum des bigaradiers en fleur.',
            'notes' => ['top' => ['Néroli', 'Mandarine'], 'heart' => ['Fleur d’oranger', 'Jasmin sambac'], 'base' => ['Musc blanc', 'Miel']],
            'variants' => [[30, 450, 30], [50, 650, 22], [100, 920, 14]],
        ],
        [
            'slug' => 'cedre-de-l-atlas', 'name' => 'Cèdre de l’Atlas', 'family' => 'boise', 'concentration' => 'Eau de parfum', 'gender' => 'masculin',
            'accent' => '#5F6E4B', 'longevity' => 4, 'sillage' => 3, 'featured' => false, 'badge' => null,
            'collections' => ['essentiels'],
            'tagline' => 'L’air vif des cimes et la noblesse du bois.',
            'description' => 'Le genièvre et le citron ouvrent la voie vers un cœur de cèdre de l’Atlas, sec et lumineux, souligné d’iris. Le vétiver et l’ambrette ancrent la composition dans une élégance minérale.',
            'inspiration' => 'Une marche matinale dans les forêts d’Azrou, entre les cèdres centenaires et la terre humide de rosée.',
            'notes' => ['top' => ['Genièvre', 'Citron'], 'heart' => ['Cèdre de l’Atlas', 'Iris'], 'base' => ['Vétiver', 'Ambrette']],
            'variants' => [[50, 620, 20], [100, 890, 12]],
        ],
        [
            'slug' => 'ombre-de-cuir', 'name' => 'Ombre de Cuir', 'family' => 'cuir', 'concentration' => 'Extrait de parfum', 'gender' => 'masculin',
            'accent' => '#4B2E25', 'longevity' => 5, 'sillage' => 4, 'featured' => false, 'badge' => null,
            'collections' => ['nocturne'],
            'tagline' => 'Un cuir fumé, tabac blond et bouleau.',
            'description' => 'Un départ de bergamote et de poivre noir précède un cœur de cuir souple et de tabac blond. Le bouleau fumé et le labdanum signent un fond sombre, enveloppant, terriblement addictif.',
            'inspiration' => 'L’atelier d’un maroquinier de Fès, les peaux tannées qui sèchent au soleil et la fumée d’une cigarette roulée.',
            'notes' => ['top' => ['Bergamote', 'Poivre noir'], 'heart' => ['Cuir', 'Tabac blond'], 'base' => ['Bouleau', 'Labdanum']],
            'variants' => [[50, 980, 10], [100, 1390, 7]],
        ],
        [
            'slug' => 'menthe-nomade', 'name' => 'Menthe Nomade', 'family' => 'hesperide', 'concentration' => 'Eau de parfum', 'gender' => 'mixte',
            'accent' => '#7FA88E', 'longevity' => 2, 'sillage' => 3, 'featured' => false, 'badge' => null,
            'collections' => ['jardins-de-medina'],
            'tagline' => 'Un thé à la menthe sous la tente, au milieu des dunes.',
            'description' => 'La menthe nanah et le citron vert apportent une fraîcheur immédiate, adoucie par un cœur de thé vert et de fleur de figuier. Un fond de musc et de bois flotté prolonge cette sensation de fraîcheur ensoleillée.',
            'inspiration' => 'Le rituel du thé servi de haut, dans un bivouac de Merzouga, quand la chaleur du jour retombe enfin.',
            'notes' => ['top' => ['Menthe nanah', 'Citron vert'], 'heart' => ['Thé vert', 'Fleur de figuier'], 'base' => ['Musc', 'Bois flotté']],
            'variants' => [[30, 390, 35], [50, 560, 26], [100, 790, 15]],
        ],
        [
            'slug' => 'rose-saharienne', 'name' => 'Rose Saharienne', 'family' => 'floral', 'concentration' => 'Eau de parfum', 'gender' => 'feminin',
            'accent' => '#B24A5E', 'longevity' => 4, 'sillage' => 4, 'featured' => true, 'badge' => null,
            'collections' => ['nocturne', 'jardins-de-medina'],
            'tagline' => 'La rose de Kelâa, poivrée et ambrée.',
            'description' => 'Le litchi et le poivre rose éveillent une rose de Kelâa M’Gouna intense et veloutée, rehaussée de géranium. Le patchouli et l’ambre lui donnent un fond chaud, presque cuivré.',
            'inspiration' => 'La vallée des roses au mois de mai, quand les cueilleuses remplissent leurs paniers avant que le soleil ne soit trop haut.',
            'notes' => ['top' => ['Litchi', 'Poivre rose'], 'heart' => ['Rose de Kelâa', 'Géranium'], 'base' => ['Patchouli', 'Ambre']],
            'variants' => [[30, 480, 18], [50, 690, 0], [100, 980, 11]],
        ],
        [
            'slug' => 'musc-opalin', 'name' => 'Musc Opalin', 'family' => 'musque', 'concentration' => 'Eau de parfum', 'gender' => 'mixte',
            'accent' => '#CFC6BA', 'longevity' => 3, 'sillage' => 2, 'featured' => false, 'badge' => null,
            'collections' => ['essentiels'],
            'tagline' => 'Une seconde peau, douce et poudrée.',
            'description' => 'Des aldéhydes lumineux et une poire juteuse s’effacent devant un cœur d’iris et de fleur de coton. Les muscs blancs et la note cachemire laissent sur la peau un halo propre et réconfortant.',
            'inspiration' => 'Le linge blanc qui sèche sur les terrasses d’Asilah, battu par le vent de l’Atlantique.',
            'notes' => ['top' => ['Aldéhydes', 'Poire'], 'heart' => ['Iris', 'Fleur de coton'], 'base' => ['Muscs blancs', 'Cachemire']],
            'variants' => [[30, 420, 28], [50, 600, 20], [100, 860, 4]],
        ],
        [
            'slug' => 'santal-dore', 'name' => 'Santal Doré', 'family' => 'boise', 'concentration' => 'Eau de parfum', 'gender' => 'mixte',
            'accent' => '#B98A4E', 'longevity' => 4, 'sillage' => 3, 'featured' => false, 'badge' => null,
            'collections' => ['essentiels', 'nocturne'],
            'tagline' => 'Un santal crémeux, figue et fève tonka.',
            'description' => 'La cardamome et la figue ouvrent sur un santal crémeux, presque lacté. La fève tonka et le cèdre lui donnent un fond doux et boisé, d’une sensualité tranquille.',
            'inspiration' => 'Un coffret en bois de santal retrouvé dans une maison de famille à Essaouira, encore chargé de souvenirs.',
            'notes' => ['top' => ['Cardamome', 'Figue'], 'heart' => ['Santal', 'Accord lacté'], 'base' => ['Fève tonka', 'Cèdre']],
            'variants' => [[50, 720, 15], [100, 1020, 9]],
        ],
        [
            'slug' => 'neroli-d-essaouira', 'name' => 'Néroli d’Essaouira', 'family' => 'hesperide', 'concentration' => 'Eau de parfum', 'gender' => 'mixte',
            'accent' => '#E2B35C', 'longevity' => 2, 'sillage' => 2, 'featured' => false, 'badge' => 'new',
            'collections' => ['jardins-de-medina'],
            'tagline' => 'Le soleil sur l’océan, l’éclat des agrumes.',
            'description' => 'La bergamote et le néroli rayonnent, portés par la vivacité du petit-grain. La fleur d’oranger arrondit l’ensemble avant un fond de musc et d’ambrette, léger comme les embruns.',
            'inspiration' => 'Les remparts d’Essaouira balayés par l’alizé, les mouettes et l’odeur des orangers du marché.',
            'notes' => ['top' => ['Bergamote', 'Néroli'], 'heart' => ['Petit-grain', 'Fleur d’oranger'], 'base' => ['Musc', 'Ambrette']],
            'variants' => [[30, 380, 32], [50, 540, 24], [100, 760, 18]],
        ],
        [
            'slug' => 'encens-nocturne', 'name' => 'Encens Nocturne', 'family' => 'ambre', 'concentration' => 'Extrait de parfum', 'gender' => 'mixte',
            'accent' => '#3F3A52', 'longevity' => 5, 'sillage' => 4, 'featured' => false, 'badge' => null,
            'collections' => ['nocturne', 'editions-rares'],
            'tagline' => 'Encens, myrrhe et vanille, comme une prière.',
            'description' => 'L’élémi et le poivre noir ouvrent sur un cœur d’encens et de myrrhe, mystique et lumineux. Le cèdre et une vanille sombre prolongent ce sillage contemplatif.',
            'inspiration' => 'La fraîcheur d’une zaouïa à la tombée de la nuit, quand l’encens monte lentement vers la coupole.',
            'notes' => ['top' => ['Élémi', 'Poivre noir'], 'heart' => ['Encens', 'Myrrhe'], 'base' => ['Cèdre', 'Vanille']],
            'variants' => [[30, 690, 12], [50, 1090, 8], [100, 1590, 5]],
        ],
        [
            'slug' => 'velours-noir', 'name' => 'Velours Noir', 'family' => 'ambre', 'concentration' => 'Eau de parfum', 'gender' => 'feminin',
            'accent' => '#2E2428', 'longevity' => 4, 'sillage' => 5, 'featured' => true, 'badge' => null,
            'collections' => ['nocturne'],
            'tagline' => 'Prune, tubéreuse et cacao, une étoffe de nuit.',
            'description' => 'Une prune confite et la cannelle réchauffent un cœur de tubéreuse et de cacao. La vanille noire et le musc prolongent cette étoffe sombre et soyeuse, faite pour les soirées qui ne finissent pas.',
            'inspiration' => 'Une robe de velours noir et un rouge à lèvres prune, au moment de sortir dans la nuit casablancaise.',
            'notes' => ['top' => ['Prune', 'Cannelle'], 'heart' => ['Tubéreuse', 'Cacao'], 'base' => ['Vanille noire', 'Musc']],
            'variants' => [[30, 520, 14], [50, 740, 12], [100, 1050, 6]],
        ],
        [
            'slug' => 'iris-poudre', 'name' => 'Iris Poudré', 'family' => 'musque', 'concentration' => 'Eau de parfum', 'gender' => 'feminin',
            'accent' => '#9C94B8', 'longevity' => null, 'sillage' => null, 'featured' => false, 'badge' => null, 'draft' => true,
            'collections' => [],
            'tagline' => 'Brouillon : un iris en cours de composition.',
            'description' => 'Fiche en préparation, non visible sur la boutique.',
            'inspiration' => null,
            'notes' => ['top' => ['Bergamote'], 'heart' => ['Iris'], 'base' => ['Musc']],
            'variants' => [[50, 640, 0]],
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
            'status' => ($definition['draft'] ?? false) ? ProductStatus::Draft : ProductStatus::Active,
            'is_featured' => $definition['featured'],
            'badge' => $definition['badge'],
            'accent_color' => $definition['accent'],
            'sort_order' => $position,
            // Staggered dates give the "newest" sort a meaningful order.
            'published_at' => now()->subDays(count(self::PRODUCTS) - $position)->startOfDay(),
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

        $product->images()->createMany([
            ['path' => "/images/demo/{$definition['slug']}-1.svg", 'alt' => "Flacon de {$definition['name']}", 'width' => 800, 'height' => 1000, 'sort_order' => 0],
            ['path' => "/images/demo/{$definition['slug']}-2.svg", 'alt' => "{$definition['name']} et son étui", 'width' => 800, 'height' => 1000, 'sort_order' => 1],
        ]);

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
            'tagline' => 'Trois parfums au choix, en format 30 ml.',
            'description' => 'Composez votre trio parmi nos parfums proposés en 30 ml : l’idéal pour explorer la maison, ou pour offrir.',
            'selection_count' => 3,
            'allowed_sizes' => [30],
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
            'description' => 'Choisissez trois parfums en 50 ml parmi les collections Nocturne et Les Essentiels.',
            'selection_count' => 3,
            'allowed_sizes' => [50],
            'eligibility' => PackEligibility::Collections,
            'allow_duplicates' => false,
            'pricing_type' => PackPricing::Fixed,
            'price' => 179000,
            'sort_order' => 1,
        ]);
        $signature?->eligibleCollections()->sync([$collections['nocturne']->id, $collections['essentiels']->id]);

        $nuit = $this->pack('coffret-nuit', [
            'name' => 'Coffret Nuit',
            'type' => PackType::Fixed,
            'tagline' => 'Trois sillages pour la nuit, réunis dans un écrin.',
            'description' => 'Nuit d’Ambre, Encens Nocturne et Velours Noir : un trio composé par la maison pour découvrir la collection Nocturne.',
            'eligibility' => PackEligibility::All,
            'pricing_type' => PackPricing::Amount,
            'discount_value' => 30000,
            'sort_order' => 2,
        ]);

        if ($nuit !== null && $nuit->items()->doesntExist()) {
            foreach ([['nuit-d-ambre', 50], ['encens-nocturne', 50], ['velours-noir', 30]] as $index => [$slug, $size]) {
                $variant = ProductVariant::query()
                    ->whereHas('product', fn ($query) => $query->where('slug', $slug))
                    ->where('size_ml', $size)
                    ->firstOrFail();

                $nuit->items()->create(['product_variant_id' => $variant->id, 'quantity' => 1, 'sort_order' => $index]);
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
