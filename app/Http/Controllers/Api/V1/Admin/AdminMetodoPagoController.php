<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Support\MetodoPagoToggle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminMetodoPagoController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => MetodoPagoToggle::listForAdmin(),
        ]);
    }

    public function update(Request $request, string $codigo)
    {
        $codigo = strtolower(trim($codigo));
        if (! MetodoPagoToggle::exists($codigo)) {
            return response()->json(['success' => false, 'message' => 'Metodo invalido.'], 422);
        }

        $data = $request->validate([
            'active' => 'required|boolean',
            'password' => 'required|string',
        ]);

        $admin = $request->user();
        if (! Hash::check($data['password'], $admin->password)) {
            return response()->json(['success' => false, 'message' => 'Contrasena incorrecta.'], 422);
        }

        MetodoPagoToggle::set($codigo, (bool) $data['active'], $admin->id);

        return response()->json([
            'success' => true,
            'message' => 'Configuracion actualizada.',
            'data' => MetodoPagoToggle::listForAdmin(),
        ]);
    }
}
