<?php

namespace Tests\Feature\Notifications;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Notifications\LowStockAlert;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Tests\TestCase;

class LowStockAlertTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_subject_names_the_format_when_only_one_runs_low(): void
    {
        $mail = (new LowStockAlert([$this->variant(stock: 3)]))->toMail(new AnonymousNotifiable);

        $this->assertSame('Stock bas : Ambre Nuit — 50 ml', $mail->subject);
    }

    public function test_lists_each_format_with_what_is_left_and_links_to_the_low_stock_list(): void
    {
        $html = (string) (new LowStockAlert([$this->variant(stock: 3), $this->variant(stock: 0, sku: 'RP-AMBRE-100', size: 100)]))->toMail(new AnonymousNotifiable)->render();

        $this->assertStringContainsString('3 (seuil 5)', $html);
        $this->assertStringContainsString('RP-AMBRE-100', $html);
        $this->assertStringContainsString('Épuisé', $html);
        $this->assertStringContainsString(config('app.url').'/admin/stock?filter=low', $html);
    }

    private function variant(int $stock, string $sku = 'RP-AMBRE-50', int $size = 50): ProductVariant
    {
        return ProductVariant::factory()
            ->for(Product::factory()->state(['name' => 'Ambre Nuit']))
            ->create(['sku' => $sku, 'size_ml' => $size, 'stock' => $stock, 'low_stock_threshold' => 5]);
    }
}
