<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Collection;
use App\Models\DeliveryZone;
use App\Models\FragranceFamily;
use App\Models\Note;
use App\Models\Pack;
use App\Models\Page;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;

/**
 * Arabic versions of the demo catalogue, the delivery grid and the content pages.
 * Only empty Arabic fields are filled, so running it again never overwrites text the
 * store has written in the administration.
 */
class ArabicContentSeeder extends Seeder
{
    private const EAU_DE_PARFUM = 'ماء عطر';

    private const EXTRAIT = 'خلاصة عطر';

    public function run(): void
    {
        $this->fill(Product::withTrashed(), 'slug', [
            'nuit-d-ambre' => [
                'name' => 'ليلة العنبر',
                'tagline' => 'عنبر مضيء يمتدّ حتى الفجر.',
                'description' => 'تنفتح «ليلة العنبر» على إشراقة البرغموت ودفء الهيل المتبَّل. في القلب، ينسج اللادن والورد الدمشقي نسيجًا ذهبيًا، قبل أن تستقرّ قاعدة من العنبر الرمادي وفانيليا بوربون والجاوي طوال الليل.',
                'inspiration' => 'سطوح مراكش في الساعة التي تُضاء فيها الفوانيس: الحجر لا يزال دافئًا، ورائحة الراتنجات تحترق في الأفنية، وذلك الضوء العنبري الذي يليّن كل شيء.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'oud-minuit' => [
                'name' => 'عود منتصف الليل',
                'tagline' => 'الخشب الثمين، يتجلّى في العتمة.',
                'description' => 'عود مدخَّن ومخمليّ، يضيئه الزعفران والفلفل الوردي. تلطّف الوردة التركية حدّته، بينما يمدّ الصندل والباتشولي ولمسة من الجلد أثره حتى الصباح الباكر.',
                'inspiration' => 'صالون مكسوّ بالمخمل في ساعة متأخرة من الليل، يُحرَق فيه عود من خشب الأغار إكرامًا للضيوف.',
                'concentration' => self::EXTRAIT,
            ],
            'fleur-de-medina' => [
                'name' => 'زهرة المدينة',
                'tagline' => 'زهر البرتقال في قلب الأزقّة البيضاء.',
                'description' => 'باقة من الزهور البيضاء قُطفت عند الفجر: يتألّق النيرولي واليوسفي، ويتفتّح زهر البرتقال والياسمين السمباك، ثم يأتي وشاح من المسك الأبيض والعسل ليلامس البشرة.',
                'inspiration' => 'أبواب المدينة العتيقة في تطوان، مواربةً، يفوح منها عبير أشجار النارنج المزهرة.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'cedre-de-l-atlas' => [
                'name' => 'أرز الأطلس',
                'tagline' => 'هواء القمم المنعش ونُبل الخشب.',
                'description' => 'يفتح العرعر والليمون الطريق نحو قلب من أرز الأطلس، جافّ ومضيء، يبرزه السوسن. ويرسّخ نجيل الهند وبذور المسك التركيبةَ في أناقة معدنية.',
                'inspiration' => 'نزهة صباحية في غابات أزرو، بين أشجار الأرز المعمّرة والتربة المبلَّلة بالندى.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'ombre-de-cuir' => [
                'name' => 'ظلّ الجلد',
                'tagline' => 'جلد مدخَّن وتبغ أشقر وبتولا.',
                'description' => 'افتتاحية من البرغموت والفلفل الأسود تسبق قلبًا من الجلد الناعم والتبغ الأشقر. ويوقّع البتولا المدخَّن واللادن قاعدة داكنة، دافئة وآسرة.',
                'inspiration' => 'ورشة دبّاغ في فاس، والجلود المدبوغة تجفّ تحت الشمس، ودخان سيجارة ملفوفة باليد.',
                'concentration' => self::EXTRAIT,
            ],
            'menthe-nomade' => [
                'name' => 'نعناع البدو',
                'tagline' => 'شاي بالنعناع تحت الخيمة، وسط الكثبان.',
                'description' => 'يمنح النعناع والليمون الأخضر انتعاشًا فوريًا، يلطّفه قلب من الشاي الأخضر وزهر التين. وتمدّ قاعدة من المسك والخشب الطافي هذا الإحساس بانتعاش مشمس.',
                'inspiration' => 'طقس الشاي المسكوب من علٍ في مخيّم بمرزوكة، حين تخفّ حرارة النهار أخيرًا.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'rose-saharienne' => [
                'name' => 'وردة الصحراء',
                'tagline' => 'وردة قلعة مكونة، متبَّلة وعنبرية.',
                'description' => 'يوقظ الليتشي والفلفل الوردي وردةً من قلعة مكونة، كثيفة ومخملية، تزيدها العطرشة تألّقًا. ويمنحها الباتشولي والعنبر قاعدة دافئة تكاد تكون نحاسية.',
                'inspiration' => 'وادي الورود في شهر ماي، حين تملأ القاطفات سلالهنّ قبل أن تعلو الشمس كثيرًا.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'musc-opalin' => [
                'name' => 'المسك الأوبالي',
                'tagline' => 'بشرة ثانية، ناعمة وبودرية.',
                'description' => 'تتلاشى الألدهيدات المضيئة والكمثرى الغضّة أمام قلب من السوسن وزهر القطن. ويترك المسك الأبيض ونفحة الكشمير على البشرة هالة نقيّة ومريحة.',
                'inspiration' => 'الغسيل الأبيض الذي يجفّ على سطوح أصيلة، تلفحه رياح الأطلسي.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'santal-dore' => [
                'name' => 'الصندل الذهبي',
                'tagline' => 'صندل كريميّ وتين وحبوب التونكا.',
                'description' => 'يفتح الهيل والتين على صندل كريميّ يكاد يكون حليبيًا. وتمنحه حبوب التونكا والأرز قاعدة ناعمة خشبية، بحسّية هادئة.',
                'inspiration' => 'صندوق من خشب الصندل عُثر عليه في بيت عائلي بالصويرة، لا يزال محمَّلًا بالذكريات.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'neroli-d-essaouira' => [
                'name' => 'نيرولي الصويرة',
                'tagline' => 'الشمس على المحيط، وتألّق الحمضيات.',
                'description' => 'يشعّ البرغموت والنيرولي، تحملهما حيوية البتيغرين. ويستدير زهر البرتقال بالمجموع قبل قاعدة من المسك وبذور المسك، خفيفة كرذاذ البحر.',
                'inspiration' => 'أسوار الصويرة التي تجتاحها الرياح، والنوارس، ورائحة أشجار البرتقال في السوق.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'encens-nocturne' => [
                'name' => 'بخور الليل',
                'tagline' => 'بخور ومرّ وفانيليا، كأنها صلاة.',
                'description' => 'يفتح الإيليمي والفلفل الأسود على قلب من البخور والمرّ، روحاني ومضيء. ويمدّ الأرز وفانيليا داكنة هذا الأثر التأمّلي.',
                'inspiration' => 'سكينة زاوية عند حلول الليل، حين يرتفع البخور ببطء نحو القبّة.',
                'concentration' => self::EXTRAIT,
            ],
            'velours-noir' => [
                'name' => 'المخمل الأسود',
                'tagline' => 'برقوق ومسك الروم وكاكاو، نسيج من الليل.',
                'description' => 'يدفّئ البرقوق المسكَّر والقرفة قلبًا من مسك الروم والكاكاو. وتمدّ الفانيليا السوداء والمسك هذا النسيج الداكن الحريري، المصنوع لأمسيات لا تنتهي.',
                'inspiration' => 'فستان من المخمل الأسود وأحمر شفاه بلون البرقوق، لحظة الخروج في ليل الدار البيضاء.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
            'iris-poudre' => [
                'name' => 'السوسن البودري',
                'tagline' => 'مسودّة: سوسن قيد التركيب.',
                'description' => 'بطاقة قيد الإعداد، غير ظاهرة في المتجر.',
                'concentration' => self::EAU_DE_PARFUM,
            ],
        ]);

        $this->fill(FragranceFamily::query(), 'slug', [
            'ambre' => ['name' => 'عنبري', 'description' => 'راتنجات وفانيليا وتوابل: آثار دافئة تحتضن البشرة.'],
            'boise' => ['name' => 'خشبي', 'description' => 'أرز وصندل ونجيل الهند وعود: بنية الخشب وأناقته.'],
            'floral' => ['name' => 'زهري', 'description' => 'ورد وياسمين وزهر البرتقال، بكل أنوارها.'],
            'hesperide' => ['name' => 'حمضي', 'description' => 'حمضيات وأعشاب عطرية: انتعاش صباحات الصيف المفعم بالحيوية.'],
            'cuir' => ['name' => 'جلدي', 'description' => 'جلد وتبغ ونفحات مدخَّنة: الشخصية قبل كل شيء.'],
            'musque' => ['name' => 'مسكي', 'description' => 'مسك أبيض ونفحات بودرية: العطر كبشرة ثانية.'],
        ]);

        $notes = [
            'accord-lacte' => 'نفحة حليبية', 'aldehydes' => 'ألدهيدات', 'ambre' => 'عنبر', 'ambre-gris' => 'عنبر رمادي',
            'ambrette' => 'بذور المسك', 'benjoin' => 'جاوي', 'bergamote' => 'برغموت', 'bois-flotte' => 'خشب طافٍ',
            'bouleau' => 'بتولا', 'cacao' => 'كاكاو', 'cachemire' => 'كشمير', 'cannelle' => 'قرفة',
            'cardamome' => 'هيل', 'cedre' => 'أرز', 'cedre-de-latlas' => 'أرز الأطلس', 'citron' => 'ليمون',
            'citron-vert' => 'ليمون أخضر', 'cuir' => 'جلد', 'elemi' => 'إيليمي', 'encens' => 'بخور',
            'feve-tonka' => 'حبوب التونكا', 'figue' => 'تين', 'fleur-doranger' => 'زهر البرتقال', 'fleur-de-coton' => 'زهر القطن',
            'fleur-de-figuier' => 'زهر التين', 'genievre' => 'عرعر', 'geranium' => 'عطرشة', 'iris' => 'سوسن',
            'jasmin-sambac' => 'ياسمين سمباك', 'labdanum' => 'لادن', 'litchi' => 'ليتشي', 'mandarine' => 'يوسفي',
            'menthe-nanah' => 'نعناع', 'miel' => 'عسل', 'musc' => 'مسك', 'musc-blanc' => 'مسك أبيض',
            'muscs-blancs' => 'مسك أبيض', 'myrrhe' => 'مرّ', 'neroli' => 'نيرولي', 'oud' => 'عود',
            'patchouli' => 'باتشولي', 'petit-grain' => 'بتيغرين', 'poire' => 'كمثرى', 'poivre-noir' => 'فلفل أسود',
            'poivre-rose' => 'فلفل وردي', 'prune' => 'برقوق', 'rose-de-damas' => 'ورد دمشقي', 'rose-de-kelaa' => 'ورد قلعة مكونة',
            'rose-turque' => 'ورد تركي', 'safran' => 'زعفران', 'santal' => 'صندل', 'tabac-blond' => 'تبغ أشقر',
            'the-vert' => 'شاي أخضر', 'tubereuse' => 'مسك الروم', 'vanille' => 'فانيليا', 'vanille-bourbon' => 'فانيليا بوربون',
            'vanille-noire' => 'فانيليا سوداء', 'vetiver' => 'نجيل الهند',
        ];
        $this->fill(Note::query(), 'slug', array_map(fn (string $name) => ['name' => $name], $notes));

        $this->fill(Collection::query(), 'slug', [
            'nocturne' => [
                'name' => 'الليلية',
                'tagline' => 'عطور الليل المغربي.',
                'description' => 'عنبر وجلود وأخشاب ثمينة: مجموعة صُمّمت لليل، لأنواره الخافتة ولقاءاته.',
            ],
            'essentiels' => [
                'name' => 'الأساسيات',
                'tagline' => 'عطورنا المميّزة، للاستعمال اليومي.',
                'description' => 'تركيبات مضيئة وسهلة الارتداء، من الفجر حتى المساء.',
            ],
            'jardins-de-medina' => [
                'name' => 'حدائق المدينة',
                'tagline' => 'زهور بيضاء وحمضيات ونعناع منعش.',
                'description' => 'نزهة في الرياضات والحدائق السرّية: انتعاش النوافير وعبير الزهور والحمضيات.',
            ],
            'editions-rares' => [
                'name' => 'إصدارات نادرة',
                'tagline' => 'خلاصات تُنتَج بكمّيات صغيرة.',
                'description' => 'مواد استثنائية بتركيز الخلاصة، تُنتَج في سلاسل محدودة.',
            ],
        ]);

        $this->fill(Pack::query(), 'slug', [
            'coffret-decouverte' => [
                'name' => 'علبة الاكتشاف',
                'tagline' => 'ثلاثة عطور من اختيارك، بحجم 30 مل.',
                'description' => 'ركّب ثلاثيّتك من بين عطورنا المتوفّرة بحجم 30 مل: الخيار الأمثل لاكتشاف الدار، أو للإهداء.',
            ],
            'trio-signature' => [
                'name' => 'الثلاثي المميّز',
                'tagline' => 'ثلاث قوارير بحجم 50 مل، بسعر لطيف.',
                'description' => 'اختر ثلاثة عطور بحجم 50 مل من مجموعتَي الليلية والأساسيات.',
            ],
            'coffret-nuit' => [
                'name' => 'علبة الليل',
                'tagline' => 'ثلاثة آثار لليل، في علبة واحدة.',
                'description' => 'ليلة العنبر وبخور الليل والمخمل الأسود: ثلاثيّ اختارته الدار لاكتشاف المجموعة الليلية.',
            ],
        ]);

        $this->fill(Page::query(), 'slug', [
            'la-maison' => [
                'title' => 'الدار',
                'meta_description' => 'دار عطور وُلدت في المغرب: تركيبات وعلب هدايا ونصائح.',
                'body' => <<<'TEXT'
                    تركّب Myperfum عطورًا ذات شخصية، تستلهم موادها ومناظرها من المغرب: راتنجات الأسواق، وزهر برتقال المدن العتيقة، وأرز الأطلس.

                    ## متجر تجريبي
                    الكتالوج المعروض هنا خيالي. استبدل هذا النص من لوحة الإدارة (المحتوى › الصفحات) لتروي حكاية دارك وموادك وورشاتك.

                    ## طريقتنا في العمل
                    - يُعرض كل عطر مع هرمه العطري كاملًا.
                    - تظهر رسوم التوصيل حسب مدينتك قبل تأكيد الطلب.
                    - تدفع ثمن طلبك عند الاستلام.
                    TEXT,
            ],
            'livraison' => [
                'title' => 'التوصيل',
                'meta_description' => 'مناطق التوصيل ورسومه وآجاله داخل المغرب.',
                'body' => <<<'TEXT'
                    ## المناطق والآجال
                    نوصّل إلى المدن المقترحة عند الطلب. تظهر الرسوم والأجل التقريبي بمجرّد اختيار مدينتك.

                    ## رسوم التوصيل
                    [للإكمال: أسعاركم حسب المنطقة، والمبلغ الذي يصبح التوصيل بعده مجانيًا.]

                    ## تتبّع الطلب
                    [للإكمال: شركة النقل، وتتبّع الطرد، وطريقة التواصل في حال التأخير.]
                    TEXT,
            ],
            'retours' => [
                'title' => 'الإرجاع والاستبدال',
                'meta_description' => 'شروط الإرجاع والاستبدال.',
                'body' => <<<'TEXT'
                    ## مهلة الإرجاع
                    [للإكمال: المهلة الممنوحة لإرجاع منتج وشروطها (قارورة غير مفتوحة، التغليف الأصلي…).]

                    ## الإجراءات
                    [للإكمال: طريقة التواصل معنا، وعنوان الإرجاع، ومن يتحمّل رسومه.]

                    ## استرداد المبلغ
                    [للإكمال: أجل استرداد المبلغ وطريقته.]
                    TEXT,
            ],
            'conditions-generales-de-vente' => [
                'title' => 'الشروط العامة للبيع',
                'meta_description' => 'الشروط العامة للبيع في المتجر.',
                'body' => <<<'TEXT'
                    [للإكمال بمساعدة مستشاركم القانوني قبل النشر.]

                    ## الموضوع
                    [هوية البائع، وبيانات الاتصال، والسجل التجاري، والمعرّف الضريبي.]

                    ## الأسعار
                    [العملة، والضرائب، ورسوم التوصيل المعروضة قبل التأكيد.]

                    ## الطلب والدفع
                    [مراحل الطلب، والدفع عند الاستلام، والتأكيد.]

                    ## التوصيل
                    [المناطق المخدومة، والآجال، واستلام الطرد.]

                    ## الإرجاع
                    [شروط الإرجاع واسترداد المبلغ.]

                    ## النزاعات
                    [القانون الواجب التطبيق وتسوية النزاعات.]
                    TEXT,
            ],
            'confidentialite' => [
                'title' => 'سياسة الخصوصية',
                'meta_description' => 'كيف نعالج معطياتكم الشخصية.',
                'body' => <<<'TEXT'
                    [للإكمال قبل النشر، ولا سيما وفق القانون رقم 09-08 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي.]

                    ## المعطيات التي نجمعها
                    الاسم والهاتف وعنوان التوصيل، والبريد الإلكتروني إن رغبتم: تُستعمل لتحضير طلباتكم وتوصيلها وتتبّعها.

                    ## النشرة الإخبارية
                    لا يُستعمل بريدكم للنشرة إلا بموافقتكم، وتتيح كل رسالة إلغاء الاشتراك.

                    ## حقوقكم
                    [كيفية الولوج والتصحيح والاعتراض، وبيانات المسؤول عن المعالجة.]
                    TEXT,
            ],
        ]);

        $regions = [
            'Béni Mellal-Khénifra' => 'بني ملال خنيفرة', 'Casablanca-Settat' => 'الدار البيضاء سطات',
            'Dakhla-Oued Ed-Dahab' => 'الداخلة وادي الذهب', 'Drâa-Tafilalet' => 'درعة تافيلالت',
            'Fès-Meknès' => 'فاس مكناس', 'Guelmim-Oued Noun' => 'كلميم واد نون',
            'Laâyoune-Sakia El Hamra' => 'العيون الساقية الحمراء', 'Marrakech-Safi' => 'مراكش آسفي',
            'Oriental' => 'الشرق', 'Rabat-Salé-Kénitra' => 'الرباط سلا القنيطرة',
            'Souss-Massa' => 'سوس ماسة', 'Tanger-Tétouan-Al Hoceïma' => 'طنجة تطوان الحسيمة',
        ];
        $cities = [
            'Béni Mellal' => 'بني ملال', 'Khouribga' => 'خريبكة', 'Mohammédia' => 'المحمدية', 'Berrechid' => 'برشيد',
            'Settat' => 'سطات', 'El Jadida' => 'الجديدة', 'Dar Bouazza' => 'دار بوعزة', 'Bouskoura' => 'بوسكورة',
            'Casablanca' => 'الدار البيضاء', 'Dakhla' => 'الداخلة', 'Errachidia' => 'الرشيدية', 'Ouarzazate' => 'ورزازات',
            'Fès' => 'فاس', 'Meknès' => 'مكناس', 'Taza' => 'تازة', 'Ifrane' => 'إفران', 'Guelmim' => 'كلميم',
            'Laâyoune' => 'العيون', 'Safi' => 'آسفي', 'Essaouira' => 'الصويرة', 'Marrakech' => 'مراكش', 'Oujda' => 'وجدة',
            'Nador' => 'الناظور', 'Témara' => 'تمارة', 'Rabat' => 'الرباط', 'Salé' => 'سلا', 'Kénitra' => 'القنيطرة',
            'Taroudant' => 'تارودانت', 'Agadir' => 'أكادير', 'Larache' => 'العرائش', 'Chefchaouen' => 'شفشاون',
            'Al Hoceïma' => 'الحسيمة', 'Tétouan' => 'تطوان', 'Tanger' => 'طنجة',
        ];
        foreach (City::query()->get() as $city) {
            $this->fillEmpty($city, [
                'name' => $cities[$city->name] ?? null,
                'region' => $regions[$city->region] ?? null,
            ]);
        }

        $this->fill(DeliveryZone::query(), 'delivery_estimate', [
            '24 à 48 h' => ['delivery_estimate' => 'من 24 إلى 48 ساعة'],
            '48 à 72 h' => ['delivery_estimate' => 'من 48 إلى 72 ساعة'],
            '3 à 5 jours ouvrés' => ['delivery_estimate' => 'من 3 إلى 5 أيام عمل'],
        ]);
    }

    /**
     * @param  Builder<Model>  $query
     * @param  array<string, array<string, string>>  $translations  Arabic texts keyed by the record's French key.
     */
    private function fill($query, string $key, array $translations): void
    {
        foreach ($query->whereIn($key, array_keys($translations))->get() as $record) {
            $this->fillEmpty($record, $translations[$record->{$key}]);
        }
    }

    /**
     * @param  array<string, string|null>  $arabic  Arabic texts keyed by the French attribute.
     */
    private function fillEmpty(Model $record, array $arabic): void
    {
        foreach ($arabic as $attribute => $text) {
            if ($text !== null && blank($record->{$attribute.'_ar'})) {
                $record->{$attribute.'_ar'} = $text;
            }
        }

        $record->saveQuietly();
    }
}
