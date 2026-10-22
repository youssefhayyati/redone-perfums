<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The storefront speaks French (the default, in the original columns) and Arabic.
 * Each translatable column gets an `_ar` sibling; an empty one falls back to French.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
            $table->string('tagline_ar')->nullable()->after('tagline');
            $table->text('description_ar')->nullable()->after('description');
            $table->text('inspiration_ar')->nullable()->after('inspiration');
            $table->string('concentration_ar', 60)->nullable()->after('concentration');
            $table->string('meta_title_ar')->nullable()->after('meta_title');
            $table->string('meta_description_ar', 320)->nullable()->after('meta_description');
        });

        Schema::table('fragrance_families', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
            $table->text('description_ar')->nullable()->after('description');
        });

        Schema::table('notes', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
        });

        Schema::table('collections', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
            $table->string('tagline_ar')->nullable()->after('tagline');
            $table->text('description_ar')->nullable()->after('description');
        });

        Schema::table('packs', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
            $table->string('tagline_ar')->nullable()->after('tagline');
            $table->text('description_ar')->nullable()->after('description');
        });

        Schema::table('pages', function (Blueprint $table) {
            $table->string('title_ar')->nullable()->after('title');
            $table->longText('body_ar')->nullable()->after('body');
            $table->string('meta_description_ar', 320)->nullable()->after('meta_description');
        });

        Schema::table('cities', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
            $table->string('region_ar')->nullable()->after('region');
        });

        Schema::table('delivery_zones', function (Blueprint $table) {
            $table->string('delivery_estimate_ar')->nullable()->after('delivery_estimate');
        });

        Schema::table('orders', function (Blueprint $table) {
            // The language the customer ordered in: their e-mails are written in it.
            $table->string('locale', 5)->default('fr')->after('payment_status');
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn(['name_ar', 'tagline_ar', 'description_ar', 'inspiration_ar', 'concentration_ar', 'meta_title_ar', 'meta_description_ar']));
        Schema::table('fragrance_families', fn (Blueprint $table) => $table->dropColumn(['name_ar', 'description_ar']));
        Schema::table('notes', fn (Blueprint $table) => $table->dropColumn(['name_ar']));
        Schema::table('collections', fn (Blueprint $table) => $table->dropColumn(['name_ar', 'tagline_ar', 'description_ar']));
        Schema::table('packs', fn (Blueprint $table) => $table->dropColumn(['name_ar', 'tagline_ar', 'description_ar']));
        Schema::table('pages', fn (Blueprint $table) => $table->dropColumn(['title_ar', 'body_ar', 'meta_description_ar']));
        Schema::table('cities', fn (Blueprint $table) => $table->dropColumn(['name_ar', 'region_ar']));
        Schema::table('delivery_zones', fn (Blueprint $table) => $table->dropColumn(['delivery_estimate_ar']));
        Schema::table('orders', fn (Blueprint $table) => $table->dropColumn(['locale']));
    }
};
