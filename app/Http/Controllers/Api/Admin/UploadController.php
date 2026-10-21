<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImageUploadRequest;
use App\Services\Media\ImageProcessor;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

/**
 * Images for collections and packs. The returned path is then saved on the record
 * (validated by ManagedImagePath).
 */
class UploadController extends Controller
{
    public function store(ImageUploadRequest $request, ImageProcessor $images): JsonResponse
    {
        $request->validate(['folder' => ['required', Rule::in(['collections', 'packs'])]]);

        $stored = $images->store($request->file('image'), 'uploads/'.$request->input('folder'));

        return response()->json([
            'path' => $stored['path'],
            'url' => MediaUrl::for($stored['path']),
        ], 201);
    }
}
