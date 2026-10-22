{{-- Split so neither Blade nor PHP short tags read the declaration as PHP. --}}
{!! '<'.'?xml version="1.0" encoding="UTF-8"?'.'>' !!}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
@foreach ($entries as $entry)
    <url>
        <loc>{{ url($entry['path']) }}</loc>
@if ($entry['updated_at'])
        <lastmod>{{ $entry['updated_at']->toAtomString() }}</lastmod>
@endif
    </url>
@endforeach
</urlset>
