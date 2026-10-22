<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\ProcessStep;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class ProcessStepControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_index_lists_the_steps_in_the_order_they_are_told(): void
    {
        ProcessStep::factory()->create(['title' => 'La macération', 'sort_order' => 2]);
        ProcessStep::factory()->create(['title' => 'La matière', 'sort_order' => 0]);

        $this->actingAs($this->manager())->getJson('/api/admin/process-steps')
            ->assertOk()
            ->assertJsonPath('data.*.title', ['La matière', 'La macération'])
            ->assertJsonPath('data.0.image_url', asset('images/lab/demo-orgue.webp'));
    }

    public function test_store_adds_the_step_last_and_returns_201(): void
    {
        ProcessStep::factory()->create(['sort_order' => 4]);

        $response = $this->actingAs($this->manager())->postJson('/api/admin/process-steps', [
            'title' => 'La mise en flacon',
            'title_ar' => 'التعبئة',
            'body' => 'Chaque flacon est rempli et scellé à la main.',
            'is_visible' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title_ar', 'التعبئة')
            ->assertJsonPath('data.sort_order', 5)
            ->assertJsonPath('data.is_demo', false);
    }

    public function test_store_requires_a_title_and_a_text_with_422(): void
    {
        $this->actingAs($this->manager())->postJson('/api/admin/process-steps', ['title' => '', 'body' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'body']);
    }

    public function test_store_refuses_a_photo_from_outside_the_store_with_422(): void
    {
        $this->actingAs($this->manager())->postJson('/api/admin/process-steps', [
            'title' => 'La matière',
            'body' => 'Texte',
            'image_path' => 'https://example.com/labo.jpg',
        ])->assertUnprocessable()->assertJsonValidationErrors(['image_path' => 'Chemin d’image invalide.']);
    }

    public function test_replacing_a_stock_photo_makes_the_step_the_stores_own_and_drops_the_stock_credit(): void
    {
        $step = ProcessStep::factory()->demo()->create();

        $this->actingAs($this->manager())->putJson("/api/admin/process-steps/{$step->id}", [
            ...$step->only(['title', 'body', 'image_credit']),
            'image_path' => 'uploads/lab/abc123.webp',
        ])->assertOk()->assertJsonPath('data.is_demo', false)->assertJsonPath('data.image_credit', null);
    }

    public function test_a_credit_typed_with_the_new_photo_is_kept(): void
    {
        $step = ProcessStep::factory()->demo()->create();

        $this->actingAs($this->manager())->putJson("/api/admin/process-steps/{$step->id}", [
            ...$step->only(['title', 'body']),
            'image_path' => 'uploads/lab/abc123.webp',
            'image_credit' => 'Photo : Studio Lumière',
        ])->assertOk()->assertJsonPath('data.image_credit', 'Photo : Studio Lumière');
    }

    public function test_editing_the_text_keeps_the_stock_photo_flagged(): void
    {
        $step = ProcessStep::factory()->demo()->create();

        $this->actingAs($this->manager())->putJson("/api/admin/process-steps/{$step->id}", [
            ...$step->only(['image_path', 'image_credit']),
            'title' => 'La cueillette',
            'body' => 'À l’aube.',
        ])->assertOk()->assertJsonPath('data.is_demo', true);
    }

    public function test_reorder_tells_the_steps_in_the_given_order(): void
    {
        $first = ProcessStep::factory()->create(['sort_order' => 0]);
        $second = ProcessStep::factory()->create(['sort_order' => 1]);

        $this->actingAs($this->manager())->putJson('/api/admin/process-steps/order', ['ids' => [$second->id, $first->id]])
            ->assertOk()
            ->assertJsonPath('data.*.id', [$second->id, $first->id]);
    }

    public function test_destroy_removes_the_step(): void
    {
        $step = ProcessStep::factory()->create();

        $this->actingAs($this->manager())->deleteJson("/api/admin/process-steps/{$step->id}")->assertOk();

        $this->assertModelMissing($step);
    }

    public function test_support_staff_cannot_edit_the_lab_with_403(): void
    {
        $this->actingAs(User::factory()->support()->create())->getJson('/api/admin/process-steps')->assertForbidden();
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}
