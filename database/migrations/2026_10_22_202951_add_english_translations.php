<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The storefront also speaks English (under /en). Each translatable column gets an
 * `_en` sibling next to its Arabic one; an empty one falls back to French.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('name_en')->nullable()->after('name_ar');
            $table->string('tagline_en')->nullable()->after('tagline_ar');
            $table->text('description_en')->nullable()->after('description_ar');
            $table->text('inspiration_en')->nullable()->after('inspiration_ar');
            $table->string('concentration_en', 60)->nullable()->after('concentration_ar');
            $table->string('meta_title_en')->nullable()->after('meta_title_ar');
            $table->string('meta_description_en', 320)->nullable()->after('meta_description_ar');
        });

        Schema::table('fragrance_families', function (Blueprint $table) {
            $table->string('name_en')->nullable()->after('name_ar');
            $table->text('description_en')->nullable()->after('description_ar');
        });

        Schema::table('notes', function (Blueprint $table) {
            $table->string('name_en')->nullable()->after('name_ar');
        });

        Schema::table('collections', function (Blueprint $table) {
            $table->string('name_en')->nullable()->after('name_ar');
            $table->string('tagline_en')->nullable()->after('tagline_ar');
            $table->text('description_en')->nullable()->after('description_ar');
        });

        Schema::table('packs', function (Blueprint $table) {
            $table->string('name_en')->nullable()->after('name_ar');
            $table->string('tagline_en')->nullable()->after('tagline_ar');
            $table->text('description_en')->nullable()->after('description_ar');
        });

        Schema::table('pages', function (Blueprint $table) {
            $table->string('title_en')->nullable()->after('title_ar');
            $table->longText('body_en')->nullable()->after('body_ar');
            $table->string('meta_description_en', 320)->nullable()->after('meta_description_ar');
        });

        Schema::table('cities', function (Blueprint $table) {
            $table->string('name_en')->nullable()->after('name_ar');
            $table->string('region_en')->nullable()->after('region_ar');
        });

        Schema::table('delivery_zones', function (Blueprint $table) {
            $table->string('delivery_estimate_en')->nullable()->after('delivery_estimate_ar');
        });

        Schema::table('process_steps', function (Blueprint $table) {
            $table->string('title_en', 120)->nullable()->after('title_ar');
            $table->text('body_en')->nullable()->after('body_ar');
            $table->string('detail_en', 80)->nullable()->after('detail_ar');
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn(['name_en', 'tagline_en', 'description_en', 'inspiration_en', 'concentration_en', 'meta_title_en', 'meta_description_en']));
        Schema::table('fragrance_families', fn (Blueprint $table) => $table->dropColumn(['name_en', 'description_en']));
        Schema::table('notes', fn (Blueprint $table) => $table->dropColumn(['name_en']));
        Schema::table('collections', fn (Blueprint $table) => $table->dropColumn(['name_en', 'tagline_en', 'description_en']));
        Schema::table('packs', fn (Blueprint $table) => $table->dropColumn(['name_en', 'tagline_en', 'description_en']));
        Schema::table('pages', fn (Blueprint $table) => $table->dropColumn(['title_en', 'body_en', 'meta_description_en']));
        Schema::table('cities', fn (Blueprint $table) => $table->dropColumn(['name_en', 'region_en']));
        Schema::table('delivery_zones', fn (Blueprint $table) => $table->dropColumn(['delivery_estimate_en']));
        Schema::table('process_steps', fn (Blueprint $table) => $table->dropColumn(['title_en', 'body_en', 'detail_en']));
    }
};
