@props(['url'])
@php
    // The logotype, as on the storefront: a leading "my" in accent italic (*my*perfum).
    $name = trim($slot);
@endphp
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
@if (preg_match('/^(my)(.+)$/i', $name, $parts) === 1)
<em>{{ mb_strtolower($parts[1]) }}</em>{{ mb_strtolower($parts[2]) }}
@else
{{ $name }}
@endif
</a>
</td>
</tr>
