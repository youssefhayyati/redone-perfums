<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminOrderResource;
use App\Models\Order;
use App\Rules\MoroccanPhoneNumber;
use App\Services\Orders\OrderExport;
use App\Services\Orders\OrderWorkflow;
use App\Services\Settings\StoreSettings;
use App\Support\MoroccanPhone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderController extends Controller
{
    public function __construct(private readonly OrderWorkflow $workflow) {}

    /** Delivery slips are printed in batches of at most this many orders. */
    private const SLIPS_LIMIT = 100;

    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = $this->filtered($request)->paginate(min(100, $request->integer('per_page', 20)));

        return AdminOrderResource::collection($orders)->additional([
            'counts' => Order::query()->selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status'),
        ]);
    }

    /**
     * The orders matching the list's filters as a spreadsheet (CSV for Excel: semicolons,
     * UTF-8 with a byte order mark, amounts in dirhams with a decimal comma).
     */
    public function export(Request $request, OrderExport $export): StreamedResponse
    {
        $query = $this->filtered($request)->with('items.selections');

        return response()->streamDownload(fn () => $export->write($query), 'commandes-'.now()->format('Y-m-d').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Orders to print delivery slips for: the given references (comma-separated), or else
     * the list's filters.
     */
    public function slips(Request $request, StoreSettings $settings): AnonymousResourceCollection
    {
        $request->validate(['references' => ['nullable', 'string', 'max:5000']]);
        $references = array_values(array_filter(array_map('trim', explode(',', (string) $request->query('references')))));

        if (count($references) > self::SLIPS_LIMIT) {
            throw ValidationException::withMessages(['references' => 'Imprimez '.self::SLIPS_LIMIT.' bons au plus à la fois.']);
        }

        $orders = $this->filtered($request)
            ->when($references !== [], fn ($q) => $q->whereIn('reference', $references))
            ->with('items.selections')
            ->limit(self::SLIPS_LIMIT)
            ->get();

        $phone = $settings->get('contact.phone');
        $e164 = MoroccanPhone::normalize($phone);

        return AdminOrderResource::collection($orders)->additional([
            'store' => [
                'name' => $settings->get('store.name'),
                'phone' => $e164 !== null ? MoroccanPhone::format($e164) : $phone,
            ],
        ]);
    }

    /**
     * The order list's filters, shared by the list, its export and its delivery slips.
     *
     * @return Builder<Order>
     */
    private function filtered(Request $request): Builder
    {
        $request->validate([
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
            'payment_status' => ['nullable', Rule::enum(PaymentStatus::class)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        return Order::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->query('status')))
            ->when($request->filled('payment_status'), fn ($q) => $q->where('payment_status', $request->query('payment_status')))
            ->when($request->filled('city'), fn ($q) => $q->where('city_id', $request->integer('city')))
            ->when($request->filled('from'), fn ($q) => $q->where('placed_at', '>=', $request->date('from')->startOfDay()))
            ->when($request->filled('to'), fn ($q) => $q->where('placed_at', '<=', $request->date('to')->endOfDay()))
            ->when($search = trim((string) $request->query('search')), function ($q) use ($search) {
                $term = '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%';
                $phone = MoroccanPhone::normalize($search);
                $q->where(fn ($w) => $w->where('reference', 'like', $term)
                    ->orWhere('customer_name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->when($phone, fn ($w) => $w->orWhere('phone', $phone)));
            })
            ->latest('placed_at')
            ->orderByDesc('id');
    }

    public function show(Order $order): AdminOrderResource
    {
        return new AdminOrderResource($order->load(['items.selections', 'events.user', 'user']));
    }

    public function updateStatus(Request $request, Order $order): AdminOrderResource
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(OrderStatus::class)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $order = $this->workflow->transition($order, OrderStatus::from($data['status']), $request->user(), $data['note'] ?? null);

        return new AdminOrderResource($order->load('user'));
    }

    public function updatePayment(Request $request, Order $order): AdminOrderResource
    {
        $data = $request->validate([
            'payment_status' => ['required', Rule::enum(PaymentStatus::class)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $order = $this->workflow->updatePayment($order, PaymentStatus::from($data['payment_status']), $request->user(), $data['note'] ?? null);

        return new AdminOrderResource($order->load('user'));
    }

    public function updateDelivery(Request $request, Order $order): AdminOrderResource
    {
        $data = $request->validate([
            'customer_name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'phone' => ['sometimes', 'string', new MoroccanPhoneNumber],
            'address' => ['sometimes', 'string', 'min:8', 'max:500'],
            'delivery_notes' => ['sometimes', 'nullable', 'string', 'max:500'],
            'carrier' => ['sometimes', 'nullable', 'string', 'max:80'],
            'tracking_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'admin_notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        if (isset($data['phone'])) {
            $data['phone'] = MoroccanPhone::normalize($data['phone']);
        }

        $order = $this->workflow->updateDelivery($order, $data, $request->user());

        return new AdminOrderResource($order->load('user'));
    }

    public function addNote(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'max:1000']]);

        $this->workflow->addNote($order, $data['note'], $request->user());

        return response()->json(['data' => (new AdminOrderResource($order->load(['items.selections', 'events.user', 'user'])))->resolve()], 201);
    }
}
