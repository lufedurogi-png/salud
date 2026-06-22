<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\Request;

class AdminPlanController extends Controller
{
    public function index()
    {
        $plans = Plan::query()->orderBy('is_specialized')->orderBy('name')->get();

        return response()->json(['success' => true, 'data' => $plans]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:140|unique:plans,name',
            'description' => 'nullable|string|max:255',
            'price_per_day' => 'required|numeric|min:0',
            'is_specialized' => 'required|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        $plan = Plan::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'price_per_day' => $data['price_per_day'],
            'is_specialized' => (bool) $data['is_specialized'],
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        return response()->json(['success' => true, 'data' => $plan], 201);
    }

    public function update(Request $request, int $planId)
    {
        $plan = Plan::query()->findOrFail($planId);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:140|unique:plans,name,'.$planId,
            'description' => 'nullable|string|max:255',
            'price_per_day' => 'sometimes|required|numeric|min:0',
            'is_specialized' => 'sometimes|required|boolean',
            'is_active' => 'sometimes|required|boolean',
        ]);

        if (! $plan->is_specialized) {
            unset($data['is_specialized']);
        }

        $plan->fill($data)->save();

        return response()->json(['success' => true, 'data' => $plan]);
    }

    public function destroy(int $planId)
    {
        $plan = Plan::query()->findOrFail($planId);
        if (! $plan->is_specialized || strtolower($plan->name) === 'plan de entrenamiento') {
            return response()->json([
                'success' => false,
                'message' => 'El plan estándar no se puede eliminar.',
            ], 422);
        }

        $plan->delete();

        return response()->json(['success' => true, 'message' => 'Paquete eliminado.']);
    }
}

