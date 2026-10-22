<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProcessStepRequest;
use App\Models\ProcessStep;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The steps of the homepage's "Le laboratoire" section, in the order they are told.
 */
class ProcessStepController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => ProcessStep::query()->orderBy('sort_order')->orderBy('id')->get()->map($this->present(...))]);
    }

    public function store(ProcessStepRequest $request): JsonResponse
    {
        $step = ProcessStep::create([...$request->validated(), 'sort_order' => (int) ProcessStep::query()->max('sort_order') + 1]);

        return response()->json(['data' => $this->present($step)], 201);
    }

    public function update(ProcessStepRequest $request, ProcessStep $processStep): JsonResponse
    {
        $processStep->fill($request->validated());

        // A new photo is the store's own: it no longer illustrates the step with a stock picture,
        // and the stock picture's credit goes with it unless one is typed for the new photo.
        if ($processStep->isDirty('image_path')) {
            $processStep->forceFill(['is_demo' => false]);
            if (! $processStep->isDirty('image_credit')) {
                $processStep->image_credit = null;
            }
        }
        $processStep->save();

        return response()->json(['data' => $this->present($processStep)]);
    }

    /** New order of the steps: every step id, first to last. */
    public function reorder(Request $request): JsonResponse
    {
        $ids = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'distinct', 'exists:process_steps,id'],
        ])['ids'];

        DB::transaction(function () use ($ids) {
            foreach ($ids as $position => $id) {
                ProcessStep::query()->whereKey($id)->update(['sort_order' => $position]);
            }
        });

        return $this->index();
    }

    public function destroy(ProcessStep $processStep): JsonResponse
    {
        $processStep->delete();

        return response()->json(['message' => 'Étape supprimée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(ProcessStep $step): array
    {
        return [
            ...$step->only(['id', 'title', 'title_ar', 'title_en', 'body', 'body_ar', 'body_en', 'detail', 'detail_ar', 'detail_en', 'image_path', 'image_credit', 'sort_order', 'is_visible', 'is_demo']),
            'image_url' => $step->imageUrl(),
        ];
    }
}
