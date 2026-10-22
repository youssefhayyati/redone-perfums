<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The steps of making a perfume, told on the homepage ("Le laboratoire"), each with
     * a photo of the lab. `is_demo` marks steps still illustrated by a stock photo.
     */
    public function up(): void
    {
        Schema::create('process_steps', function (Blueprint $table) {
            $table->id();
            $table->string('title', 120);
            $table->string('title_ar', 120)->nullable();
            $table->text('body');
            $table->text('body_ar')->nullable();
            // A short fact shown beside the title, e.g. "4 à 6 semaines".
            $table->string('detail', 80)->nullable();
            $table->string('detail_ar', 80)->nullable();
            $table->string('image_path')->nullable();
            // Author and licence of a photo the store did not take itself.
            $table->string('image_credit')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_visible')->default(true);
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('process_steps');
    }
};
