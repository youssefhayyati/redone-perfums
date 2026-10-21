<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class UploadControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_upload_stores_a_webp_in_the_requested_folder_and_returns_201(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->manager())->post('/api/admin/uploads', [
            'image' => UploadedFile::fake()->image('nuits.jpg', 800, 600),
            'folder' => 'collections',
        ]);

        $response->assertCreated();
        $path = $response->json('path');
        $this->assertMatchesRegularExpression('#^uploads/collections/[0-9a-z]{26}\.webp$#', $path);
        $this->assertSame('/storage/'.$path, $response->json('url'));
        $this->assertSame('WEBP', substr(Storage::disk('public')->get($path), 8, 4));
    }

    public function test_path_returned_by_the_upload_is_accepted_on_a_collection(): void
    {
        Storage::fake('public');
        $manager = $this->manager();
        $path = $this->actingAs($manager)->post('/api/admin/uploads', [
            'image' => UploadedFile::fake()->image('nuits.jpg', 800, 600),
            'folder' => 'collections',
        ])->json('path');

        $response = $this->actingAs($manager)->postJson('/api/admin/collections', ['name' => 'Nuits d’Orient', 'image_path' => $path]);

        $response->assertCreated()
            ->assertJsonPath('data.image_path', $path);
        $this->assertDatabaseHas('collections', ['slug' => 'nuits-dorient', 'image_path' => $path]);
    }

    /**
     * @return array<string, array{array<string, string>, string}>
     */
    public static function invalidFolders(): array
    {
        return [
            'missing folder' => [[], 'Le champ dossier est obligatoire.'],
            'product folder' => [['folder' => 'products'], 'La valeur choisie pour dossier n’est pas valide.'],
            'path traversal' => [['folder' => '../config'], 'La valeur choisie pour dossier n’est pas valide.'],
        ];
    }

    /**
     * @param  array<string, string>  $folder
     */
    #[DataProvider('invalidFolders')]
    public function test_upload_outside_the_managed_folders_returns_422(array $folder, string $message): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->manager())->post('/api/admin/uploads', [
            'image' => UploadedFile::fake()->image('nuits.jpg', 800, 600),
            ...$folder,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['folder' => $message]);
        Storage::disk('public')->assertDirectoryEmpty('/');
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}
