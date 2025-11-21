<?php

namespace App\Http\Controllers;

use App\Services\WeChatAuthService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    protected $authService;

    public function __construct(WeChatAuthService $authService)
    {
        $this->authService = $authService;
    }

    public function login(Request $request)
    {
        try {
            $validated = $request->validate([
                'code' => ['required', 'string'],
                'nickname' => ['nullable', 'string', 'max:50'],
            ]);

            $result = $this->authService->loginWithCode(
                $validated['code'],
                $validated['nickname'] ?? null
            );

            return response()->json($result, Response::HTTP_CREATED);
        } catch (\Exception $e) {
            \Log::error('Login failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => '登录失败：' . $e->getMessage(),
            ], 500);
        }
    }
}

