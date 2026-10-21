<?php

namespace App\Services\Media;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Re-encodes every upload with GD. The original bytes are never stored, which strips
 * metadata and any payload hidden in the file, and produces responsive WebP sizes.
 */
final class ImageProcessor
{
    public const WIDTHS = [480, 960, 1600];

    private const MAX_EDGE = 2000;

    private const QUALITY = 82;

    /**
     * @return array{path: string, variants: array<int, string>, width: int, height: int}
     */
    public function store(UploadedFile $file, string $directory): array
    {
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));

        if (! $source instanceof GdImage) {
            throw ValidationException::withMessages(['image' => 'Ce fichier n’est pas une image lisible.']);
        }

        $directory = trim($directory, '/');
        $basename = Str::lower(Str::ulid());
        $disk = Storage::disk('public');

        $width = imagesx($source);
        $height = imagesy($source);

        $main = $this->resize($source, min($width, self::MAX_EDGE));
        $mainPath = "{$directory}/{$basename}.webp";
        $disk->put($mainPath, $this->encode($main));

        $variants = [];
        foreach (self::WIDTHS as $target) {
            if ($target >= imagesx($main)) {
                continue;
            }
            $resized = $this->resize($source, $target);
            $path = "{$directory}/{$basename}-{$target}.webp";
            $disk->put($path, $this->encode($resized));
            $variants[$target] = $path;
        }
        $variants[imagesx($main)] = $mainPath;
        ksort($variants);

        return [
            'path' => $mainPath,
            'variants' => $variants,
            'width' => imagesx($main),
            'height' => imagesy($main),
        ];
    }

    /**
     * @param  array<int|string, string>|null  $variants
     */
    public function delete(?string $path, ?array $variants = null): void
    {
        // Assets shipped with the application ("/images/…") are never deleted.
        $paths = array_filter([$path, ...array_values($variants ?? [])], fn ($p) => is_string($p) && $p !== '' && ! str_starts_with($p, '/'));

        if ($paths !== []) {
            Storage::disk('public')->delete(array_unique($paths));
        }
    }

    private function resize(GdImage $source, int $targetWidth): GdImage
    {
        $width = imagesx($source);
        $height = imagesy($source);

        if ($targetWidth >= $width) {
            $copy = imagecreatetruecolor($width, $height);
            imagealphablending($copy, false);
            imagesavealpha($copy, true);
            imagecopy($copy, $source, 0, 0, 0, 0, $width, $height);

            return $copy;
        }

        $targetHeight = (int) round($height * $targetWidth / $width);
        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        return $canvas;
    }

    private function encode(GdImage $image): string
    {
        ob_start();
        imagewebp($image, null, self::QUALITY);

        return (string) ob_get_clean();
    }
}
