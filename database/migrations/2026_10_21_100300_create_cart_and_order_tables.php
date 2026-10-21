<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->uuid('token')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('converted_at')->nullable();
            $table->timestamps();

            $table->index('updated_at');
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10);
            $table->foreignId('product_variant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('pack_id')->nullable()->constrained()->cascadeOnDelete();
            // Ordered list of product_variant ids chosen for a custom pack.
            $table->json('selections')->nullable();
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 20)->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cart_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('pending');
            $table->string('payment_method', 20);
            $table->string('payment_status', 20)->default('unpaid');

            $table->string('customer_name');
            $table->string('phone', 20);
            $table->string('email')->nullable();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->string('city_name');
            $table->text('address');
            $table->text('delivery_notes')->nullable();
            $table->string('delivery_zone_name')->nullable();
            $table->string('carrier')->nullable();
            $table->string('tracking_number')->nullable();

            $table->unsignedInteger('subtotal');
            $table->unsignedInteger('discount_total')->default(0);
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->string('coupon_code', 40)->nullable();
            $table->unsignedInteger('delivery_fee');
            $table->unsignedInteger('total');
            $table->unsignedSmallInteger('items_count');

            $table->string('idempotency_key', 80)->nullable()->unique();
            $table->string('guest_token', 64)->unique();
            $table->text('admin_notes')->nullable();

            $table->timestamp('placed_at');
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'placed_at']);
            $table->index('placed_at');
            $table->index('phone');
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10);
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('pack_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('variant_label')->nullable();
            $table->string('sku', 64)->nullable();
            $table->unsignedInteger('unit_price');
            $table->unsignedInteger('compare_at_price')->nullable();
            $table->unsignedSmallInteger('quantity');
            $table->unsignedInteger('line_total');
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('order_item_selections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->unsignedSmallInteger('size_ml');
            $table->string('sku', 64);
            $table->unsignedInteger('unit_price');
            $table->unsignedTinyInteger('position');
        });

        Schema::create('order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            // status | payment | delivery | note
            $table->string('type', 20);
            $table->string('from', 40)->nullable();
            $table->string('to', 40)->nullable();
            $table->text('note')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->integer('change');
            $table->integer('stock_after');
            // sale | cancellation | adjustment | restock | initial
            $table->string('reason', 20);
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['product_variant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('order_events');
        Schema::dropIfExists('order_item_selections');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
    }
};
