<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NewsletterController extends Controller
{
    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc', 'max:190'],
            'consent' => ['accepted'],
            'source' => ['nullable', 'string', 'max:40'],
        ], [
            'consent.accepted' => __('Merci d’accepter de recevoir nos e-mails.'),
        ]);

        $email = mb_strtolower(trim($data['email']));
        $subscriber = NewsletterSubscriber::firstOrNew(['email' => $email]);

        $subscriber->fill([
            'status' => 'subscribed',
            'source' => $data['source'] ?? 'site',
            'consented_at' => now(),
            'unsubscribed_at' => null,
        ]);
        $subscriber->unsubscribe_token ??= Str::random(48);
        $subscriber->save();

        // Same answer whether or not the address was already known.
        return response()->json(['message' => __('Merci. Vous recevrez nos prochaines nouvelles.')]);
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        $token = (string) $request->input('token', '');
        $subscriber = $token !== '' ? NewsletterSubscriber::where('unsubscribe_token', $token)->first() : null;

        $subscriber?->forceFill(['status' => 'unsubscribed', 'unsubscribed_at' => now()])->save();

        return response()->json(['message' => __('Vous êtes désinscrit(e) de la newsletter.')]);
    }
}
