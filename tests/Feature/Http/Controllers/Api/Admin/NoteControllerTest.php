<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class NoteControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_support_staff_gets_403_on_note_translations(): void
    {
        $response = $this->actingAs(User::factory()->support()->create())->getJson('/api/admin/notes/translations');

        $response->assertForbidden();
    }

    public function test_index_lists_every_note_alphabetically_with_its_arabic_name(): void
    {
        Note::create(['name' => 'Vanille', 'slug' => 'vanille']);
        Note::create(['name' => 'Bergamote', 'slug' => 'bergamote', 'name_ar' => 'برغموت']);

        $response = $this->actingAs($this->manager())->getJson('/api/admin/notes/translations');

        $response->assertOk()
            ->assertJsonPath('data.*.name', ['Bergamote', 'Vanille'])
            ->assertJsonPath('data.*.name_ar', ['برغموت', null]);
    }

    public function test_update_saves_the_arabic_name_of_a_note(): void
    {
        $note = Note::create(['name' => 'Vanille', 'slug' => 'vanille']);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/notes/{$note->id}", ['name_ar' => 'فانيليا']);

        $response->assertOk()
            ->assertJsonPath('data.name_ar', 'فانيليا');
        $this->assertSame('فانيليا', $note->fresh()->name_ar);
        $this->assertSame('Vanille', $note->fresh()->name);
    }

    public function test_update_saves_the_english_name_without_touching_the_arabic_one(): void
    {
        $note = Note::create(['name' => 'Bergamote', 'slug' => 'bergamote', 'name_ar' => 'برغموت']);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/notes/{$note->id}", ['name_en' => 'Bergamot']);

        $response->assertOk()
            ->assertJsonPath('data.name_en', 'Bergamot')
            ->assertJsonPath('data.name_ar', 'برغموت');
        $this->assertSame('Bergamot', $note->fresh()->name_en);
        $this->assertSame('برغموت', $note->fresh()->name_ar);
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}
