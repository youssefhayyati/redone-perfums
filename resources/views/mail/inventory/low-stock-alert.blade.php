<x-mail::message>
# Stock à réapprovisionner

La dernière commande a fait passer ces formats sous leur seuil d’alerte :

<x-mail::table>
| Parfum | Référence | Restant |
| :----- | :-------- | ------: |
@foreach ($variants as $variant)
| {{ $variant->product?->name }} — {{ $variant->label() }} | {{ $variant->sku }} | {{ $variant->stock === 0 ? 'Épuisé' : $variant->stock.' (seuil '.$variant->low_stock_threshold.')' }} |
@endforeach
</x-mail::table>

<x-mail::button :url="$url">
Voir le stock
</x-mail::button>
</x-mail::message>
