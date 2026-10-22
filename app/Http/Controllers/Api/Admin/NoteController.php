<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Olfactory notes are created on the fly from the French names typed in the product
 * pyramid; this is where their Arabic and English names are written.
 */
class NoteController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Note::query()->withCount('products')->orderBy('name')->get(['id', 'name', 'name_ar', 'name_en']),
        ]);
    }

    public function update(Request $request, Note $note): JsonResponse
    {
        $note->update($request->validate([
            'name_ar' => ['nullable', 'string', 'max:120'],
            'name_en' => ['nullable', 'string', 'max:120'],
        ]));

        return response()->json(['data' => $note->only(['id', 'name', 'name_ar', 'name_en'])]);
    }
}
