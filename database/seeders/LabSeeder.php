<?php

namespace Database\Seeders;

use App\Models\ProcessStep;
use Illuminate\Database\Seeder;

/**
 * The making of a perfume, in five steps, for the homepage's "Le laboratoire" section.
 * The photos (public/images/lab/demo-*.webp) are freely licensed stock pictures from
 * Wikimedia Commons, cropped, credited on each step and flagged `is_demo`: the store
 * replaces them with photos of its own lab from the admin. Skipped once steps exist.
 *
 * Sources: Commons files "Jurlique Rose Harvest.jpg", "Fragonard small perfume
 * distillery.JPG", "Perfume Organ.jpg", "Fragonard (Èze)003.JPG" and "France-002800 -
 * Perfume Factory (15977938866).jpg".
 */
class LabSeeder extends Seeder
{
    public function run(): void
    {
        if (ProcessStep::query()->exists()) {
            return;
        }

        $steps = [
            [
                'title' => 'La matière', 'title_ar' => 'المادة',
                'detail' => 'Fleurs, bois, résines', 'detail_ar' => 'زهور، أخشاب، راتنجات',
                'body' => 'Tout commence par les matières premières : pétales de rose cueillis à l’aube, bois d’oud, résines et épices. Chaque lot est senti et choisi pour sa pureté avant d’entrer au laboratoire.',
                'body_ar' => 'يبدأ كل شيء بالمواد الأولية: بتلات ورد تُقطف عند الفجر، وخشب العود، والراتنجات والتوابل. يُشمّ كل صنف ويُنتقى لنقائه قبل أن يدخل المختبر.',
                'image_path' => '/images/lab/demo-matiere.webp',
                'image_credit' => 'Photo : Lukedm95 / Wikimedia Commons, CC BY-SA 4.0 (recadrée)',
            ],
            [
                'title' => 'L’extraction', 'title_ar' => 'الاستخلاص',
                'detail' => 'Distillation', 'detail_ar' => 'التقطير',
                'body' => 'Dans l’alambic de cuivre, la vapeur traverse les fleurs et en emporte l’essence. Refroidie goutte à goutte, l’huile se sépare de l’eau : il faut des tonnes de pétales pour un seul kilo d’essence de rose.',
                'body_ar' => 'في الإنبيق النحاسي، يمرّ البخار عبر الزهور فيحمل خلاصتها. وحين يبرد قطرةً قطرة، ينفصل الزيت عن الماء: يلزم أطنان من البتلات لكيلوغرام واحد من خلاصة الورد.',
                'image_path' => '/images/lab/demo-extraction.webp',
                'image_credit' => 'Photo : BrokenSphere / Wikimedia Commons, CC BY-SA 3.0 (recadrée)',
            ],
            [
                'title' => 'L’orgue', 'title_ar' => 'الأرغن',
                'detail' => 'Des centaines de notes', 'detail_ar' => 'مئات النوتات',
                'body' => 'Face à l’orgue, le parfumeur compose : quelques gouttes de chaque matière, pesées au centième de gramme. Une formule peut réunir plus de cinquante notes et demander des centaines d’essais.',
                'body_ar' => 'أمام أرغن العطور يؤلّف العطّار: قطرات من كل مادة، تُوزن بدقة جزء من مئة من الغرام. قد تجمع التركيبة أكثر من خمسين نوتة وتتطلّب مئات التجارب.',
                'image_path' => '/images/lab/demo-orgue.webp',
                'image_credit' => 'Photo : Mx. Granger / Wikimedia Commons, CC0',
            ],
            [
                'title' => 'Les essais', 'title_ar' => 'التجارب',
                'detail' => 'Sur mouillette et sur peau', 'detail_ar' => 'على شريط الاختبار وعلى البشرة',
                'body' => 'Chaque version est diluée, posée sur mouillette puis sur la peau, sentie à l’instant, des heures plus tard, le lendemain. On ajuste jusqu’à ce que le sillage tienne sa promesse, de la première note au fond.',
                'body_ar' => 'تُخفَّف كل نسخة وتوضع على شريط الاختبار ثم على البشرة، وتُشمّ فورًا ثم بعد ساعات وفي اليوم التالي. نعدّل حتى يفي الأثر بوعده، من النوتة الأولى إلى القاعدة.',
                'image_path' => '/images/lab/demo-essais.webp',
                'image_credit' => 'Photo : Georges Jansoone (JoJan) / Wikimedia Commons, CC BY 3.0 (recadrée)',
            ],
            [
                'title' => 'La macération', 'title_ar' => 'التعتيق',
                'detail' => '4 à 6 semaines', 'detail_ar' => 'من 4 إلى 6 أسابيع',
                'body' => 'Le concentré repose dans l’alcool, à l’abri de la lumière, pour que les notes se marient. Il est ensuite refroidi, filtré, puis mis en flacon et contrôlé à la main avant de vous être envoyé.',
                'body_ar' => 'يستريح المركّز في الكحول بعيدًا عن الضوء لتتآلف النوتات. ثم يُبرَّد ويُصفّى، ويُعبّأ في القوارير ويُفحص يدويًا قبل أن يُرسل إليك.',
                'image_path' => '/images/lab/demo-maceration.webp',
                'image_credit' => 'Photo : Dennis G. Jarvis / Wikimedia Commons, CC BY-SA 2.0 (recadrée)',
            ],
        ];

        foreach ($steps as $position => $step) {
            (new ProcessStep([...$step, 'sort_order' => $position]))->forceFill(['is_demo' => true])->save();
        }
    }
}
