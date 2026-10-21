<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsletterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $subscribers = NewsletterSubscriber::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->query('status')))
            ->when($search = trim((string) $request->query('search')), fn ($q) => $q->where('email', 'like', '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%'))
            ->latest()
            ->paginate(min(100, $request->integer('per_page', 25)));

        return response()->json([
            'data' => $subscribers->getCollection()->map(fn ($s) => [
                'id' => $s->id,
                'email' => $s->email,
                'status' => $s->status,
                'source' => $s->source,
                'consented_at' => $s->consented_at?->toIso8601String(),
                'unsubscribed_at' => $s->unsubscribed_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $subscribers->currentPage(),
                'last_page' => $subscribers->lastPage(),
                'total' => $subscribers->total(),
                'per_page' => $subscribers->perPage(),
            ],
            'counts' => [
                'subscribed' => NewsletterSubscriber::where('status', 'subscribed')->count(),
                'unsubscribed' => NewsletterSubscriber::where('status', 'unsubscribed')->count(),
            ],
        ]);
    }
}
