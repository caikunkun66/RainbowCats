<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public function recordStatus(User $user, array $payload): void
    {
        Notification::create([
            'user_id' => $user->id,
            'template_id' => $payload['template_id'],
            'status' => $payload['status'],
            'payload' => $payload,
        ]);
    }

    public function dispatchPending(): void
    {
        Notification::query()
            ->where('status', 'pending')
            ->chunkById(50, function ($notifications) {
                foreach ($notifications as $notification) {
                    // TODO: integrate with WeChat SubscribeMessage or Aliyun channels.
                }
            });
    }
}



