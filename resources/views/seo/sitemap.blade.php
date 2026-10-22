{{-- Split so neither Blade nor PHP short tags read the declaration as PHP. --}}
{!! '<'.'?xml version="1.0" encoding="UTF-8"?'.'>' !!}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
@foreach ($entries as $entry)
@foreach ($locales as $locale)
    <url>
        <loc>{{ url(\App\Support\Locale::path($entry['path'], $locale)) }}</loc>
@foreach ($locales as $alternate)
        <xhtml:link rel="alternate" hreflang="{{ $alternate }}" href="{{ url(\App\Support\Locale::path($entry['path'], $alternate)) }}"/>
@endforeach
@if ($entry['updated_at'])
        <lastmod>{{ $entry['updated_at']->toAtomString() }}</lastmod>
@endif
    </url>
@endforeach
@endforeach
</urlset>
