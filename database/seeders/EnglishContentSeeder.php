<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Collection;
use App\Models\DeliveryZone;
use App\Models\FragranceFamily;
use App\Models\Note;
use App\Models\Pack;
use App\Models\Page;
use App\Models\ProcessStep;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;

/**
 * English versions of the demo catalogue, the lab steps, the delivery grid and the
 * content pages. Perfume names keep their French originals, as perfume houses do
 * abroad. Only empty English fields are filled, so running it again never overwrites
 * text the store has written in the administration.
 */
class EnglishContentSeeder extends Seeder
{
    private const EAU_DE_PARFUM = 'Eau de Parfum';

    private const EXTRAIT = 'Extrait de Parfum';

    public function run(): void
    {
        $this->fill(Product::withTrashed(), 'slug', [
            'nuit-d-ambre' => [
                'tagline' => 'A luminous amber that lingers until dawn.',
                'description' => 'Nuit d’Ambre opens on the brightness of bergamot and the peppery warmth of cardamom. At its heart, labdanum and Damask rose weave a golden fabric, before a base of ambergris, Bourbon vanilla and benzoin settles in for the night.',
                'inspiration' => 'The rooftops of Marrakesh as the lamps come on: the stone still warm, the scent of resins burning in the courtyards, and that amber light that softens everything.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'oud-minuit' => [
                'tagline' => 'Precious wood, revealed in the dark.',
                'description' => 'A smoky, velvety oud, lit by saffron and pink pepper. Turkish rose softens its intensity while sandalwood, patchouli and a touch of leather carry the trail into the early morning.',
                'inspiration' => 'A velvet-draped salon late at night, where a sliver of agarwood is burned to honour the guests.',
                'concentration' => self::EXTRAIT,
            ],
            'fleur-de-medina' => [
                'tagline' => 'Orange blossom in the heart of the white alleys.',
                'description' => 'An armful of white flowers picked at dawn: neroli and mandarin sparkle, orange blossom and sambac jasmine bloom, then a veil of white musk and honey comes to caress the skin.',
                'inspiration' => 'The half-open doors of the Tetouan medina, letting out the scent of bitter orange trees in bloom.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'cedre-de-l-atlas' => [
                'tagline' => 'The crisp air of the peaks and the nobility of wood.',
                'description' => 'Juniper and lemon lead the way to a heart of Atlas cedar, dry and luminous, underlined with iris. Vetiver and ambrette anchor the composition in a mineral elegance.',
                'inspiration' => 'A morning walk in the forests of Azrou, among century-old cedars and earth still damp with dew.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'ombre-de-cuir' => [
                'tagline' => 'Smoky leather, blond tobacco and birch.',
                'description' => 'An opening of bergamot and black pepper leads to a heart of supple leather and blond tobacco. Smoked birch and labdanum sign off with a dark, enveloping and utterly addictive base.',
                'inspiration' => 'A leatherworker’s workshop in Fez, tanned hides drying in the sun and the smoke of a hand-rolled cigarette.',
                'concentration' => self::EXTRAIT,
            ],
            'menthe-nomade' => [
                'tagline' => 'Mint tea under the tent, among the dunes.',
                'description' => 'Nanah mint and lime bring instant freshness, softened by a heart of green tea and fig blossom. A base of musk and driftwood carries this sunlit freshness on.',
                'inspiration' => 'The ritual of tea poured from on high in a Merzouga camp, as the heat of the day finally fades.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'rose-saharienne' => [
                'tagline' => 'The rose of Kelaa, peppery and amber-warm.',
                'description' => 'Lychee and pink pepper awaken an intense, velvety Kelaa M’Gouna rose, lifted with geranium. Patchouli and amber give it a warm, almost coppery base.',
                'inspiration' => 'The Valley of Roses in May, when the pickers fill their baskets before the sun climbs too high.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'musc-opalin' => [
                'tagline' => 'A second skin, soft and powdery.',
                'description' => 'Luminous aldehydes and a juicy pear give way to a heart of iris and cotton flower. White musks and a cashmere note leave a clean, comforting halo on the skin.',
                'inspiration' => 'White linen drying on the rooftops of Asilah, tossed by the Atlantic wind.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'santal-dore' => [
                'tagline' => 'Creamy sandalwood, fig and tonka bean.',
                'description' => 'Cardamom and fig open onto a creamy, almost milky sandalwood. Tonka bean and cedar give it a soft, woody base of quiet sensuality.',
                'inspiration' => 'A sandalwood box found in a family house in Essaouira, still full of memories.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'neroli-d-essaouira' => [
                'tagline' => 'Sun on the ocean, the sparkle of citrus.',
                'description' => 'Bergamot and neroli shine, carried by the liveliness of petitgrain. Orange blossom rounds everything out before a base of musk and ambrette, light as sea spray.',
                'inspiration' => 'The ramparts of Essaouira swept by the trade wind, the seagulls and the scent of the market’s orange trees.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'encens-nocturne' => [
                'tagline' => 'Incense, myrrh and vanilla, like a prayer.',
                'description' => 'Elemi and black pepper open onto a heart of incense and myrrh, mystical and luminous. Cedar and a dark vanilla draw out this contemplative trail.',
                'inspiration' => 'The coolness of a zaouia at nightfall, when the incense rises slowly towards the dome.',
                'concentration' => self::EXTRAIT,
            ],
            'velours-noir' => [
                'tagline' => 'Plum, tuberose and cocoa, a fabric woven from the night.',
                'description' => 'Candied plum and cinnamon warm a heart of tuberose and cocoa. Black vanilla and musk draw out this dark, silky fabric, made for evenings that never end.',
                'inspiration' => 'A black velvet dress and plum lipstick, just as you step out into the Casablanca night.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'iris-poudre' => [
                'tagline' => 'Draft: an iris still being composed.',
                'description' => 'Product page in progress, not shown in the shop.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
        ]);

        $this->fill(FragranceFamily::query(), 'slug', [
            'ambre' => ['name' => 'Amber', 'description' => 'Resins, vanilla and spices: warm trails that wrap around the skin.'],
            'boise' => ['name' => 'Woody', 'description' => 'Cedar, sandalwood, vetiver and oud: the structure and elegance of wood.'],
            'floral' => ['name' => 'Floral', 'description' => 'Rose, jasmine and orange blossom, in every light.'],
            'hesperide' => ['name' => 'Citrus', 'description' => 'Citrus fruits and herbs: the lively freshness of summer mornings.'],
            'cuir' => ['name' => 'Leather', 'description' => 'Leather, tobacco and smoky notes: character above all.'],
            'musque' => ['name' => 'Musky', 'description' => 'White musks and powdery notes: perfume as a second skin.'],
        ]);

        $notes = [
            'accord-lacte' => 'Milky accord', 'aldehydes' => 'Aldehydes', 'ambre' => 'Amber', 'ambre-gris' => 'Ambergris',
            'ambrette' => 'Ambrette', 'benjoin' => 'Benzoin', 'bergamote' => 'Bergamot', 'bois-flotte' => 'Driftwood',
            'bouleau' => 'Birch', 'cacao' => 'Cocoa', 'cachemire' => 'Cashmere', 'cannelle' => 'Cinnamon',
            'cardamome' => 'Cardamom', 'cedre' => 'Cedar', 'cedre-de-latlas' => 'Atlas cedar', 'citron' => 'Lemon',
            'citron-vert' => 'Lime', 'cuir' => 'Leather', 'elemi' => 'Elemi', 'encens' => 'Incense',
            'feve-tonka' => 'Tonka bean', 'figue' => 'Fig', 'fleur-doranger' => 'Orange blossom', 'fleur-de-coton' => 'Cotton flower',
            'fleur-de-figuier' => 'Fig blossom', 'genievre' => 'Juniper', 'geranium' => 'Geranium', 'iris' => 'Iris',
            'jasmin-sambac' => 'Sambac jasmine', 'labdanum' => 'Labdanum', 'litchi' => 'Lychee', 'mandarine' => 'Mandarin',
            'menthe-nanah' => 'Nanah mint', 'miel' => 'Honey', 'musc' => 'Musk', 'musc-blanc' => 'White musk',
            'muscs-blancs' => 'White musks', 'myrrhe' => 'Myrrh', 'neroli' => 'Neroli', 'oud' => 'Oud',
            'patchouli' => 'Patchouli', 'petit-grain' => 'Petitgrain', 'poire' => 'Pear', 'poivre-noir' => 'Black pepper',
            'poivre-rose' => 'Pink pepper', 'prune' => 'Plum', 'rose-de-damas' => 'Damask rose', 'rose-de-kelaa' => 'Kelaa rose',
            'rose-turque' => 'Turkish rose', 'safran' => 'Saffron', 'santal' => 'Sandalwood', 'tabac-blond' => 'Blond tobacco',
            'the-vert' => 'Green tea', 'tubereuse' => 'Tuberose', 'vanille' => 'Vanilla', 'vanille-bourbon' => 'Bourbon vanilla',
            'vanille-noire' => 'Black vanilla', 'vetiver' => 'Vetiver',
        ];
        $this->fill(Note::query(), 'slug', array_map(fn (string $name) => ['name' => $name], $notes));

        $this->fill(Collection::query(), 'slug', [
            'nocturne' => [
                'name' => 'Nocturne',
                'tagline' => 'The perfumes of the Moroccan night.',
                'description' => 'Ambers, leathers and precious woods: a collection made for the night, its dimmed lights and its encounters.',
            ],
            'essentiels' => [
                'name' => 'The Essentials',
                'tagline' => 'Our signatures, to wear every day.',
                'description' => 'Bright, easy-to-wear compositions, from dawn until evening.',
            ],
            'jardins-de-medina' => [
                'name' => 'Medina Gardens',
                'tagline' => 'White flowers, citrus and fresh mint.',
                'description' => 'A stroll through riads and secret gardens: the coolness of fountains, the scent of flowers and citrus.',
            ],
            'editions-rares' => [
                'name' => 'Rare Editions',
                'tagline' => 'Extraits made in small batches.',
                'description' => 'Exceptional materials worked at extrait concentration and produced in limited runs.',
            ],
        ]);

        $this->fill(Pack::query(), 'slug', [
            'coffret-decouverte' => [
                'name' => 'Discovery Set',
                'tagline' => 'Three perfumes of your choice, in 30 ml.',
                'description' => 'Put together your trio from our perfumes offered in 30 ml: ideal for exploring the house, or as a gift.',
            ],
            'trio-signature' => [
                'name' => 'Signature Trio',
                'tagline' => 'Three 50 ml bottles, at a gentle price.',
                'description' => 'Choose three perfumes in 50 ml from the Nocturne and The Essentials collections.',
            ],
            'coffret-nuit' => [
                'name' => 'Night Set',
                'tagline' => 'Three trails for the night, gathered in one box.',
                'description' => 'Nuit d’Ambre, Encens Nocturne and Velours Noir: a trio chosen by the house to discover the Nocturne collection.',
            ],
        ]);

        $this->fill(ProcessStep::query(), 'title', [
            'La matière' => [
                'title' => 'The material',
                'detail' => 'Flowers, woods, resins',
                'body' => 'It all begins with the raw materials: rose petals picked at dawn, oud wood, resins and spices. Each batch is smelled and chosen for its purity before it enters the lab.',
            ],
            'L’extraction' => [
                'title' => 'Extraction',
                'detail' => 'Distillation',
                'body' => 'In the copper still, steam passes through the flowers and carries away their essence. Cooled drop by drop, the oil separates from the water: it takes tonnes of petals to make a single kilo of rose essence.',
            ],
            'L’orgue' => [
                'title' => 'The organ',
                'detail' => 'Hundreds of notes',
                'body' => 'At the organ, the perfumer composes: a few drops of each material, weighed to a hundredth of a gram. A formula can bring together more than fifty notes and take hundreds of trials.',
            ],
            'Les essais' => [
                'title' => 'The trials',
                'detail' => 'On blotter and on skin',
                'body' => 'Each version is diluted, placed on a blotter and then on the skin, and smelled at once, hours later and the next day. We adjust until the trail keeps its promise, from the first note to the base.',
            ],
            'La macération' => [
                'title' => 'Maceration',
                'detail' => '4 to 6 weeks',
                'body' => 'The concentrate rests in alcohol, away from the light, so that the notes can blend. It is then chilled, filtered, bottled and checked by hand before being sent to you.',
            ],
        ]);

        $this->fill(Page::query(), 'slug', [
            'la-maison' => [
                'title' => 'The house',
                'meta_description' => 'A perfume house imagined in Morocco: compositions, gift sets and advice.',
                'body' => <<<'TEXT'
                    Myperfum composes perfumes with character, drawn from the materials and landscapes of Morocco: the resins of the souks, the orange blossom of the medinas, the cedar of the Atlas.

                    ## A demo shop
                    The catalogue shown here is fictional. Replace this text from the administration (Contenu › Pages) to tell the story of your house, your materials and your workshops.

                    ## How we work
                    - Every perfume is shown with its complete olfactory pyramid.
                    - The delivery fee for your city is shown before you confirm your order.
                    - You pay for your order on delivery.
                    TEXT,
            ],
            'livraison' => [
                'title' => 'Delivery',
                'meta_description' => 'Delivery zones, fees and times in Morocco.',
                'body' => <<<'TEXT'
                    ## Zones and times
                    We deliver to the cities offered at checkout. The fee and the estimated time appear as soon as you choose your city.

                    ## Delivery fees
                    [To complete: your rates by zone and the amount from which delivery is free.]

                    ## Order tracking
                    [To complete: carrier, parcel tracking, who to contact if there is a delay.]
                    TEXT,
            ],
            'retours' => [
                'title' => 'Returns and exchanges',
                'meta_description' => 'Return and exchange conditions.',
                'body' => <<<'TEXT'
                    ## Return period
                    [To complete: the time allowed to return an item and the conditions (unopened bottle, original packaging…).]

                    ## How to return
                    [To complete: how to contact us, the return address, who pays for the return.]

                    ## Refunds
                    [To complete: refund time and method.]
                    TEXT,
            ],
            'conditions-generales-de-vente' => [
                'title' => 'Terms and conditions of sale',
                'meta_description' => 'The shop’s terms and conditions of sale.',
                'body' => <<<'TEXT'
                    [To complete with your legal adviser before publishing.]

                    ## Purpose
                    [Seller’s identity, contact details, trade register, tax identifier.]

                    ## Prices
                    [Currency, taxes, delivery fees shown before confirmation.]

                    ## Orders and payment
                    [Ordering steps, cash on delivery, confirmation.]

                    ## Delivery
                    [Areas served, delivery times, receiving the parcel.]

                    ## Returns
                    [Return and refund conditions.]

                    ## Disputes
                    [Applicable law and dispute resolution.]
                    TEXT,
            ],
            'confidentialite' => [
                'title' => 'Privacy policy',
                'meta_description' => 'How we handle your personal data.',
                'body' => <<<'TEXT'
                    [To complete before publishing, in particular in light of Law No. 09-08 on the protection of individuals with regard to the processing of personal data.]

                    ## Data we collect
                    Name, phone number, delivery address and, if you wish, email address: they are used to prepare, deliver and track your orders.

                    ## Newsletter
                    Your address is only used for the house newsletter with your consent. Every email lets you unsubscribe.

                    ## Your rights
                    [How to access, correct and object to your data; contact details of the data controller.]
                    TEXT,
            ],
        ]);

        $regions = [
            'Béni Mellal-Khénifra' => 'Beni Mellal-Khenifra', 'Casablanca-Settat' => 'Casablanca-Settat',
            'Dakhla-Oued Ed-Dahab' => 'Dakhla-Oued Ed-Dahab', 'Drâa-Tafilalet' => 'Draa-Tafilalet',
            'Fès-Meknès' => 'Fez-Meknes', 'Guelmim-Oued Noun' => 'Guelmim-Oued Noun',
            'Laâyoune-Sakia El Hamra' => 'Laayoune-Sakia El Hamra', 'Marrakech-Safi' => 'Marrakesh-Safi',
            'Oriental' => 'Oriental', 'Rabat-Salé-Kénitra' => 'Rabat-Sale-Kenitra',
            'Souss-Massa' => 'Souss-Massa', 'Tanger-Tétouan-Al Hoceïma' => 'Tangier-Tetouan-Al Hoceima',
        ];
        $cities = [
            'Béni Mellal' => 'Beni Mellal', 'Khouribga' => 'Khouribga', 'Mohammédia' => 'Mohammedia', 'Berrechid' => 'Berrechid',
            'Settat' => 'Settat', 'El Jadida' => 'El Jadida', 'Dar Bouazza' => 'Dar Bouazza', 'Bouskoura' => 'Bouskoura',
            'Casablanca' => 'Casablanca', 'Dakhla' => 'Dakhla', 'Errachidia' => 'Errachidia', 'Ouarzazate' => 'Ouarzazate',
            'Fès' => 'Fez', 'Meknès' => 'Meknes', 'Taza' => 'Taza', 'Ifrane' => 'Ifrane', 'Guelmim' => 'Guelmim',
            'Laâyoune' => 'Laayoune', 'Safi' => 'Safi', 'Essaouira' => 'Essaouira', 'Marrakech' => 'Marrakesh', 'Oujda' => 'Oujda',
            'Nador' => 'Nador', 'Témara' => 'Temara', 'Rabat' => 'Rabat', 'Salé' => 'Sale', 'Kénitra' => 'Kenitra',
            'Taroudant' => 'Taroudant', 'Agadir' => 'Agadir', 'Larache' => 'Larache', 'Chefchaouen' => 'Chefchaouen',
            'Al Hoceïma' => 'Al Hoceima', 'Tétouan' => 'Tetouan', 'Tanger' => 'Tangier',
        ];
        foreach (City::query()->get() as $city) {
            $this->fillEmpty($city, [
                'name' => $cities[$city->name] ?? null,
                'region' => $regions[$city->region] ?? null,
            ]);
        }

        $this->fill(DeliveryZone::query(), 'delivery_estimate', [
            '24 à 48 h' => ['delivery_estimate' => '24 to 48 hours'],
            '48 à 72 h' => ['delivery_estimate' => '48 to 72 hours'],
            '3 à 5 jours ouvrés' => ['delivery_estimate' => '3 to 5 working days'],
        ]);
    }

    /**
     * @param  Builder<Model>  $query
     * @param  array<string, array<string, string>>  $translations  English texts keyed by the record's French key.
     */
    private function fill($query, string $key, array $translations): void
    {
        foreach ($query->whereIn($key, array_keys($translations))->get() as $record) {
            $this->fillEmpty($record, $translations[$record->{$key}]);
        }
    }

    /**
     * @param  array<string, string|null>  $english  English texts keyed by the French attribute.
     */
    private function fillEmpty(Model $record, array $english): void
    {
        foreach ($english as $attribute => $text) {
            if ($text !== null && blank($record->{$attribute.'_en'})) {
                $record->{$attribute.'_en'} = $text;
            }
        }

        $record->saveQuietly();
    }
}
