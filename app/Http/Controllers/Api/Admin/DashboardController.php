<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Order;
use App\Models\Page;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\Settings\StoreSettings;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Every figure is computed from orders in the database. Cancelled orders are
 * excluded from revenue and sales.
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request, StoreSettings $settings): JsonResponse
    {
        $days = in_array($request->integer('days'), [7, 30, 90, 365], true) ? $request->integer('days') : 30;

        $end = CarbonImmutable::now();
        $start = $end->subDays($days - 1)->startOfDay();
        $previousStart = $start->subDays($days);

        $current = $this->totals($start, $end);
        $previous = $this->totals($previousStart, $start);
        $canSeeRevenue = $request->user()->hasPermission(Permission::ViewRevenue);

        return response()->json([
            'range' => ['days' => $days, 'from' => $start->toDateString(), 'to' => $end->toDateString()],
            'kpis' => [
                'revenue' => $canSeeRevenue ? $current['revenue'] : null,
                'revenue_previous' => $canSeeRevenue ? $previous['revenue'] : null,
                'orders' => $current['orders'],
                'orders_previous' => $previous['orders'],
                'average_order_value' => $canSeeRevenue && $current['orders'] > 0 ? intdiv($current['revenue'], $current['orders']) : null,
                'average_order_value_previous' => $canSeeRevenue && $previous['orders'] > 0 ? intdiv($previous['revenue'], $previous['orders']) : null,
                'pending_orders' => Order::query()->where('status', OrderStatus::Pending)->count(),
                'cancelled_orders' => Order::query()->where('status', OrderStatus::Cancelled)->whereBetween('placed_at', [$start, $end])->count(),
            ],
            'trend' => $this->trend($start, $end, $days, $canSeeRevenue),
            'best_sellers' => $this->bestSellers($start, $end),
            'status_breakdown' => Order::query()
                ->whereBetween('placed_at', [$start, $end])
                ->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->pluck('count', 'status'),
            'low_stock' => ProductVariant::query()
                ->where('is_active', true)
                ->whereColumn('stock', '<=', 'low_stock_threshold')
                ->whereHas('product', fn ($q) => $q->withoutTrashed())
                ->with('product:id,name,slug')
                ->orderBy('stock')
                ->limit(10)
                ->get()
                ->map(fn (ProductVariant $v) => [
                    'variant_id' => $v->id,
                    'product_id' => $v->product_id,
                    'product' => $v->product->name,
                    'label' => $v->label(),
                    'sku' => $v->sku,
                    'stock' => $v->stock,
                    'threshold' => $v->low_stock_threshold,
                ]),
            'recent_orders' => Order::query()->latest('placed_at')->limit(8)->get()->map(fn (Order $o) => [
                'reference' => $o->reference,
                'customer_name' => $o->customer_name,
                'city' => $o->city_name,
                'total' => $canSeeRevenue || $request->user()->hasPermission(Permission::ManageOrders) ? $o->total : null,
                'status' => $o->status->value,
                'placed_at' => $o->placed_at->toIso8601String(),
            ]),
            'setup' => $this->setupChecklist($settings),
        ]);
    }

    /**
     * @return array{revenue: int, orders: int}
     */
    private function totals(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $row = Order::query()
            ->where('status', '!=', OrderStatus::Cancelled)
            ->where('placed_at', '>=', $from)
            ->where('placed_at', '<', $to)
            ->selectRaw('COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders')
            ->first();

        return ['revenue' => (int) $row->revenue, 'orders' => (int) $row->orders];
    }

    /**
     * @return list<array{date: string, revenue: ?int, orders: int}>
     */
    private function trend(CarbonImmutable $start, CarbonImmutable $end, int $days, bool $withRevenue): array
    {
        $rows = Order::query()
            ->where('status', '!=', OrderStatus::Cancelled)
            ->whereBetween('placed_at', [$start, $end])
            ->selectRaw('DATE(placed_at) as day, SUM(total) as revenue, COUNT(*) as orders')
            ->groupByRaw('DATE(placed_at)')
            ->get()
            ->keyBy(fn ($r) => (string) $r->day);

        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $day = $start->addDays($i)->toDateString();
            $row = $rows->get($day);
            $series[] = [
                'date' => $day,
                'revenue' => $withRevenue ? (int) ($row->revenue ?? 0) : null,
                'orders' => (int) ($row->orders ?? 0),
            ];
        }

        return $series;
    }

    /**
     * Units sold per product, counting bottles sold individually and inside packs.
     *
     * @return list<array{product_id: int, name: string, units: int}>
     */
    private function bestSellers(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $valid = fn ($q) => $q->from('orders')
            ->whereColumn('orders.id', 'order_items.order_id')
            ->where('orders.status', '!=', OrderStatus::Cancelled->value)
            ->whereBetween('orders.placed_at', [$start, $end]);

        $single = DB::table('order_items')
            ->where('type', 'product')
            ->whereNotNull('product_id')
            ->whereExists($valid)
            ->groupBy('product_id')
            ->selectRaw('product_id, SUM(quantity) as units')
            ->pluck('units', 'product_id');

        $inPacks = DB::table('order_item_selections')
            ->join('order_items', 'order_items.id', '=', 'order_item_selections.order_item_id')
            ->whereNotNull('order_item_selections.product_id')
            ->whereExists($valid)
            ->groupBy('order_item_selections.product_id')
            ->selectRaw('order_item_selections.product_id as product_id, SUM(order_items.quantity) as units')
            ->pluck('units', 'product_id');

        $units = [];
        foreach ([$single, $inPacks] as $source) {
            foreach ($source as $productId => $count) {
                $units[$productId] = ($units[$productId] ?? 0) + (int) $count;
            }
        }

        arsort($units);
        $top = array_slice($units, 0, 6, true);
        $names = Product::withTrashed()->whereIn('id', array_keys($top))->pluck('name', 'id');

        return array_values(array_map(
            fn ($productId, $count) => ['product_id' => (int) $productId, 'name' => $names[$productId] ?? '—', 'units' => $count],
            array_keys($top),
            $top,
        ));
    }

    /**
     * @return list<array{key: string, label: string, done: bool, link: string}>
     */
    private function setupChecklist(StoreSettings $settings): array
    {
        $requiredPages = ['livraison', 'retours', 'conditions-generales-de-vente', 'confidentialite'];
        $published = Page::query()->whereIn('slug', $requiredPages)->where('is_published', true)->count();

        return [
            ['key' => 'contact', 'label' => 'Renseigner les coordonnées de contact', 'done' => (bool) ($settings->get('contact.email') || $settings->get('contact.phone')), 'link' => '/admin/reglages'],
            ['key' => 'delivery', 'label' => 'Vérifier les zones et frais de livraison', 'done' => City::query()->deliverable()->exists(), 'link' => '/admin/livraison'],
            ['key' => 'pages', 'label' => "Publier les pages légales ({$published}/".count($requiredPages).')', 'done' => $published === count($requiredPages), 'link' => '/admin/pages'],
            ['key' => 'demo', 'label' => 'Remplacer le catalogue de démonstration', 'done' => ! Product::query()->where('is_demo', true)->exists(), 'link' => '/admin/produits'],
        ];
    }
}
