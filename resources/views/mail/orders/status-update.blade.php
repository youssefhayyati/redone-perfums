@use('App\Enums\OrderStatus')
@use('App\Support\Money')
@use('Illuminate\Support\Str')
<x-mail::message>
@switch($status)
@case(OrderStatus::Confirmed)
# {{ __('Votre commande est confirmée') }}

{{ __('Bonne nouvelle, :name : votre commande **:reference** est confirmée. Nous préparons votre colis avec soin.', ['name' => Str::before($order->customer_name, ' '), 'reference' => $order->reference]) }}
@break
@case(OrderStatus::Shipped)
# {{ __('Votre commande est en route') }}

{{ __('Votre commande **:reference** a été remise au transporteur.', ['reference' => $order->reference]) }}

@if ($order->carrier || $order->tracking_number)
@if ($order->carrier)
**{{ __('Transporteur') }}**{{ __(' : ') }}{{ $order->carrier }}<br>
@endif
@if ($order->tracking_number)
**{{ __('Numéro de suivi') }}**{{ __(' : ') }}<span dir="ltr">{{ $order->tracking_number }}</span>
@endif

@endif
@if ($payOnDelivery)
{{ __('Prévoyez **:amount** en espèces pour la livraison.', ['amount' => Money::format($order->total, $order->locale)]) }}
@endif
@break
@case(OrderStatus::Delivered)
# {{ __('Votre commande est livrée') }}

{{ __('Votre commande **:reference** vous a été livrée. Merci de votre confiance : nous espérons que vos parfums vous accompagneront longtemps.', ['reference' => $order->reference]) }}
@break
@default
# {{ __('Votre commande est annulée') }}

{{ __('Votre commande **:reference** a été annulée. Si vous ne l’avez pas demandé, ou pour commander à nouveau, contactez-nous.', ['reference' => $order->reference]) }}
@endswitch

<x-mail::button :url="$url">
{{ __('Suivre ma commande') }}
</x-mail::button>

@if ($canReply)
{{ __('Une question ? Répondez simplement à cet e-mail.') }}

@endif
{{ __('À très vite,') }}<br>
{{ config('app.name') }}
</x-mail::message>
