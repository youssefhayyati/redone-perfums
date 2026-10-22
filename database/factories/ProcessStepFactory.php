<?php

namespace Database\Factories;

use App\Models\ProcessStep;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProcessStep>
 */
class ProcessStepFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->randomElement(['La matière', 'L’extraction', 'L’orgue', 'Les essais', 'La macération']),
            'body' => fake()->sentence(18),
            'detail' => null,
            'image_path' => '/images/lab/demo-orgue.webp',
            'image_credit' => null,
            'sort_order' => 0,
            'is_visible' => true,
        ];
    }

    /** Still illustrated by a stock photo, waiting for one of the store's own lab. */
    public function demo(): static
    {
        return $this->state(['image_credit' => 'Photo : exemple / Wikimedia Commons, CC0'])->afterMaking(fn (ProcessStep $step) => $step->forceFill(['is_demo' => true]));
    }

    public function hidden(): static
    {
        return $this->state(['is_visible' => false]);
    }
}
