<?php

namespace Tests\Feature\Lang;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class EnglishTranslationsTest extends TestCase
{
    /**
     * Every message the server can show a customer is written in French and wrapped in
     * __() or trans_choice(); an English customer would see French wherever lang/en.json
     * lacks the key. The admin's own messages are not wrapped and are not checked.
     */
    public function test_every_translatable_server_message_has_an_english_version(): void
    {
        $english = $this->english();
        $sources = [...File::allFiles(app_path()), ...File::allFiles(resource_path('views'))];

        $missing = [];
        foreach ($sources as $file) {
            preg_match_all("/(?:__|trans_choice)\\(\\s*'((?:[^'\\\\]|\\\\.)*)'/", $file->getContents(), $matches);

            foreach ($matches[1] as $key) {
                $key = str_replace("\\'", "'", $key);
                if (! array_key_exists($key, $english) && ! str_contains($key, '.')) {
                    $missing[] = $key.'  ('.$file->getRelativePathname().')';
                }
            }
        }

        $this->assertSame([], $missing);
    }

    /**
     * The fallback language is French: a framework string (password reset e-mail, error
     * summaries) missing from lang/en.json would reach an English customer in French.
     */
    public function test_every_string_translated_for_french_or_arabic_also_exists_in_english(): void
    {
        $english = $this->english();
        $others = [
            ...json_decode(File::get(lang_path('fr.json')), true, flags: JSON_THROW_ON_ERROR),
            ...json_decode(File::get(lang_path('ar.json')), true, flags: JSON_THROW_ON_ERROR),
        ];

        $this->assertSame([], array_values(array_diff(array_keys($others), array_keys($english))));
    }

    public function test_english_counted_sentences_offer_a_singular_and_a_plural(): void
    {
        $plurals = array_filter($this->english(), fn (string $key) => str_contains($key, '|'), ARRAY_FILTER_USE_KEY);

        $this->assertNotEmpty($plurals);
        foreach ($plurals as $key => $value) {
            $this->assertCount(2, explode('|', $value), $key);
        }
    }

    /**
     * @return array<string, string>
     */
    private function english(): array
    {
        return json_decode(File::get(lang_path('en.json')), true, flags: JSON_THROW_ON_ERROR);
    }
}
