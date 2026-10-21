<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\Settings\StoreSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(private readonly StoreSettings $settings) {}

    public function show(): JsonResponse
    {
        $values = $this->settings->all();

        $fields = collect(StoreSettings::schema())->map(fn ($definition, $key) => [
            'key' => $key,
            'group' => $definition['group'],
            'type' => $definition['type'],
            'label' => $definition['label'],
            'value' => $values[$key],
        ])->values();

        return response()->json([
            'data' => $fields,
            'products' => Product::query()->published()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $rules = [];
        $attributes = [];
        foreach (StoreSettings::schema() as $key => $definition) {
            $field = 'values.'.str_replace('.', '\.', $key);
            $attributes['values.'.$key] = $definition['label'];
            $rules[$field] = match ($definition['type']) {
                'boolean' => ['sometimes', 'boolean'],
                'integer' => ['sometimes', 'nullable', 'integer', 'min:0'],
                'url' => ['sometimes', 'nullable', 'url:https', 'max:255'],
                'text' => ['sometimes', 'nullable', 'string', 'max:2000'],
                default => ['sometimes', 'nullable', 'string', 'max:255'],
            };
        }

        $rules['values'] = ['required', 'array'];
        $rules['values.announcement\.link'] = ['sometimes', 'nullable', 'string', 'max:255', 'regex:#^/[A-Za-z0-9/_\-?=&]*$#'];
        $rules['values.contact\.email'] = ['sometimes', 'nullable', 'email', 'max:190'];

        $request->validate($rules, [
            'values.announcement.link.regex' => 'Le lien doit être un chemin interne commençant par « / ».',
        ], $attributes);

        $this->settings->put($request->input('values'));

        return $this->show();
    }
}
