<!DOCTYPE html>
<html lang="fr" dir="ltr" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    @include('partials.theme-init')
    <title>Administration — {{ $storeName }}</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    @fonts
    @vite(['resources/js/admin/main.ts'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
