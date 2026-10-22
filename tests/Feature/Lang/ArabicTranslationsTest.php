<?php

namespace Tests\Feature\Lang;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ArabicTranslationsTest extends TestCase
{
    /**
     * Every message the server can show a customer is written in French and wrapped in
     * __() or trans_choice(); an Arabic customer would see French wherever lang/ar.json
     * lacks the key. The admin's own messages are not wrapped and are not checked.
     */
    public function test_every_translatable_server_message_has_an_arabic_version(): void
    {
        $arabic = json_decode(File::get(lang_path('ar.json')), true, flags: JSON_THROW_ON_ERROR);
        $sources = [...File::allFiles(app_path()), ...File::allFiles(resource_path('views'))];

        $missing = [];
        foreach ($sources as $file) {
            preg_match_all("/(?:__|trans_choice)\\(\\s*'((?:[^'\\\\]|\\\\.)*)'/", $file->getContents(), $matches);

            foreach ($matches[1] as $key) {
                $key = str_replace("\\'", "'", $key);
                if (! array_key_exists($key, $arabic) && ! str_contains($key, '.')) {
                    $missing[] = $key.'  ('.$file->getRelativePathname().')';
                }
            }
        }

        $this->assertSame([], $missing);
    }

    public function test_arabic_counted_sentences_offer_all_six_plural_forms(): void
    {
        $arabic = json_decode(File::get(lang_path('ar.json')), true, flags: JSON_THROW_ON_ERROR);

        $plurals = array_filter($arabic, fn (string $key) => str_contains($key, '|'), ARRAY_FILTER_USE_KEY);

        $this->assertNotEmpty($plurals);
        foreach ($plurals as $key => $value) {
            $this->assertCount(6, explode('|', $value), $key);
        }
    }
}
