<?php

namespace Tests\Unit\Rules;

use App\Rules\ManagedImagePath;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class ManagedImagePathTest extends TestCase
{
    /**
     * @return array<string, array{string}>
     */
    public static function acceptedPaths(): array
    {
        return [
            'collection upload' => ['uploads/collections/01jbz6x4kq3m2v8w9y7t5r1p0n.webp'],
            'pack upload' => ['uploads/packs/abc123.webp'],
            'bundled webp asset' => ['/images/demo/aurore.webp'],
            'bundled jpg asset' => ['/images/og-default.jpg'],
            'bundled svg asset' => ['/images/brand/logo.svg'],
            'bundled png with dash and underscore' => ['/images/packs/coffret_nuit-2.png'],
        ];
    }

    #[DataProvider('acceptedPaths')]
    public function test_accepts_uploaded_and_bundled_image_paths(string $path): void
    {
        $this->assertNull($this->failureMessageFor($path));
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function rejectedPaths(): array
    {
        return [
            'external url' => ['https://evil.example/image.webp'],
            'protocol relative url' => ['//evil.example/image.webp'],
            'javascript scheme' => ['javascript:alert(1)'],
            'leading traversal' => ['../uploads/collections/abc.webp'],
            'traversal inside uploads' => ['uploads/collections/../../.env'],
            'traversal inside images' => ['/images/../storage/secret.png'],
            'upload that is not webp' => ['uploads/collections/photo.jpg'],
            'uppercase upload folder' => ['uploads/Collections/abc.webp'],
            'upload without folder' => ['uploads/abc.webp'],
            'product image directory' => ['products/12/abc.webp'],
            'unsupported bundled format' => ['/images/animation.gif'],
            'query string' => ['/images/demo/aurore.webp?v=2'],
            'empty string' => [''],
            'not a string' => [42],
        ];
    }

    #[DataProvider('rejectedPaths')]
    public function test_rejects_paths_outside_the_managed_locations(mixed $path): void
    {
        $this->assertSame('Chemin d’image invalide.', $this->failureMessageFor($path));
    }

    private function failureMessageFor(mixed $value): ?string
    {
        $message = null;

        (new ManagedImagePath)->validate('image_path', $value, function (string $failure) use (&$message): void {
            $message = $failure;
        });

        return $message;
    }
}
