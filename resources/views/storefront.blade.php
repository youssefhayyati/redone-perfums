<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    @include('partials.theme-init')

    <title>{{ $meta['title'] }}</title>
    <meta name="description" content="{{ $meta['description'] }}">
    <link rel="canonical" href="{{ $meta['url'] }}">
    @if ($meta['noindex'])
        <meta name="robots" content="noindex, nofollow">
    @endif

    <meta property="og:site_name" content="{{ $meta['site_name'] }}">
    <meta property="og:type" content="{{ $meta['type'] }}">
    <meta property="og:title" content="{{ $meta['title'] }}">
    <meta property="og:description" content="{{ $meta['description'] }}">
    <meta property="og:url" content="{{ $meta['url'] }}">
    <meta property="og:image" content="{{ $meta['image'] }}">
    <meta property="og:locale" content="fr_MA">
    <meta name="twitter:card" content="summary_large_image">

    <meta name="theme-color" content="#0b0a09">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="/favicon.ico" sizes="any">

    @fonts
    @viteReactRefresh
    @vite(['resources/js/storefront/main.tsx'])

    @if ($meta['jsonld'])
        <script type="application/ld+json">{!! json_encode($meta['jsonld'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
    @endif
    <script>window.__STOREFRONT__ = {!! json_encode($config, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!};</script>
</head>
<body>
    <div id="app"></div>
    <noscript>
        <p style="padding:2rem;font-family:sans-serif">Cette boutique nécessite JavaScript pour fonctionner.</p>
    </noscript>
</body>
</html>
