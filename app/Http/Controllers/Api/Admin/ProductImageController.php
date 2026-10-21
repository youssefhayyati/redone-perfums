<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImageUploadRequest;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\Media\ImageProcessor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductImageController extends Controller
{
    public function __construct(private readonly ImageProcessor $images) {}

    public function store(ImageUploadRequest $request, Product $product): JsonResponse
    {
        abort_if($product->images()->count() >= 12, 422, 'Douze images maximum par produit.');

        $stored = $this->images->store($request->file('image'), 'products/'.$product->id);

        $image = $product->images()->create([
            ...$stored,
            'alt' => $request->input('alt') ?: $product->name,
            'sort_order' => (int) $product->images()->max('sort_order') + 1,
        ]);

        return response()->json(['data' => $image->toPublicArray()], 201);
    }

    public function update(Request $request, Product $product, ProductImage $image): JsonResponse
    {
        $image->update($request->validate(['alt' => ['nullable', 'string', 'max:160']]));

        return response()->json(['data' => $image->toPublicArray()]);
    }

    public function reorder(Request $request, Product $product): JsonResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        foreach (array_values($ids) as $position => $id) {
            $product->images()->whereKey($id)->update(['sort_order' => $position]);
        }

        return response()->json(['data' => $product->images()->get()->map->toPublicArray()]);
    }

    public function destroy(Product $product, ProductImage $image): JsonResponse
    {
        $this->images->delete($image->path, $image->variants);
        $image->delete();

        return response()->json(['message' => 'Image supprimée.']);
    }
}
