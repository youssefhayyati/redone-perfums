<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImageUploadRequest;
use App\Services\Media\ImageProcessor;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Images for collections and packs. The returned path is then saved on the record
 * (validated by ManagedImagePath).
 */
class UploadController extends Controller
{
    /** Upload folders, each with the permission needed to fill it. */
    private const FOLDERS = [
        'collections' => 'manage-catalog',
        'packs' => 'manage-catalog',
        'lab' => 'manage-content',
    ];

    public function store(ImageUploadRequest $request, ImageProcessor $images): JsonResponse
    {
        $folder = $request->validate(['folder' => ['required', Rule::in(array_keys(self::FOLDERS))]])['folder'];
        Gate::authorize(self::FOLDERS[$folder]);

        $stored = $images->store($request->file('image'), 'uploads/'.$folder);

        return response()->json([
            'path' => $stored['path'],
            'url' => MediaUrl::for($stored['path']),
        ], 201);
    }
}
