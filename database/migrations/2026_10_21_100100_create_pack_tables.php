<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('packs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            // custom: the customer composes it; fixed: contents defined by pack_items.
            $table->string('type', 10);
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->unsignedTinyInteger('selection_count')->nullable();
            $table->json('allowed_sizes')->nullable();
            // all | collections | products
            $table->string('eligibility', 20)->default('all');
            $table->boolean('allow_duplicates')->default(false);
            // fixed: price is final; percent / amount: reduction on the sum of selections.
            $table->string('pricing_type', 10);
            $table->unsignedInteger('price')->nullable();
            $table->unsignedInteger('discount_value')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_demo')->default(false);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('pack_collection', function (Blueprint $table) {
            $table->foreignId('pack_id')->constrained()->cascadeOnDelete();
            $table->foreignId('collection_id')->constrained()->cascadeOnDelete();
            $table->primary(['pack_id', 'collection_id']);
        });

        Schema::create('pack_product', function (Blueprint $table) {
            $table->foreignId('pack_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['pack_id', 'product_id']);
        });

        Schema::create('pack_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pack_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('quantity')->default(1);
            $table->unsignedInteger('sort_order')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pack_items');
        Schema::dropIfExists('pack_product');
        Schema::dropIfExists('pack_collection');
        Schema::dropIfExists('packs');
    }
};
