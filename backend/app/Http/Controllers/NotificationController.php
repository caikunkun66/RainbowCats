<?php

namespace App\Http\Controllers;

use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class NotificationController extends Controller
{
    /**
     * @var \App\Services\NotificationService
     */
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    public function updateStatus(Request $request)
    {
        $data = $request->validate([
            'template_id' => ['required', 'string'],
            'status' => ['required', 'string', 'in:accept,reject,ban,unset,unknown'],
            'keep' => ['nullable', 'boolean'],
            'scene' => ['nullable', 'string', 'max:64'],
            'raw' => ['nullable', 'array'],
        ]);

        $preference = $this->notificationService->updateSubscribePreference($request->user(), $data);

        if (array_key_exists('keep', $data)) {
            $request->user()->forceFill([
                'check_flag' => (bool) $data['keep'],
            ])->save();
        }

        return response()->json([
            'message' => 'Subscribe status updated',
            'preference' => $preference,
            'check_flag' => (bool) $request->user()->check_flag,
        ], Response::HTTP_OK);
    }
}


