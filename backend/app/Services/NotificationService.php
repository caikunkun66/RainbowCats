<?php

namespace App\Services;

use App\Models\Mission;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class NotificationService
{
    /**
     * @var \App\Services\WeChatSubscribeMessageService
     */
    protected $wechatService;

    public function __construct(WeChatSubscribeMessageService $wechatService)
    {
        $this->wechatService = $wechatService;
    }

    public function recordStatus(User $user, array $payload): void
    {
        Notification::create([
            'user_id' => $user->id,
            'template_id' => $payload['template_id'],
            'status' => $payload['status'],
            'payload' => $payload,
        ]);
    }

    public function updateSubscribePreference(User $user, array $payload): array
    {
        $templateId = $payload['template_id'];
        $settings = $user->settings ?? [];
        $subscribe = $settings['subscribe'] ?? [];

        $subscribe[$templateId] = [
            'status' => $payload['status'],
            'keep' => (bool) ($payload['keep'] ?? false),
            'scene' => $payload['scene'] ?? null,
            'updated_at' => now()->toIso8601String(),
        ];

        if (isset($payload['raw'])) {
            $subscribe[$templateId]['raw'] = $payload['raw'];
        }

        $settings['subscribe'] = $subscribe;
        $user->forceFill(['settings' => $settings])->save();

        return $subscribe[$templateId];
    }

    public function notifyMissionCreated(User $creator, Mission $mission): void
    {
        $templateId = config('services.wechat.miniapp.subscribe_template_id');
        if (empty($templateId)) {
            Log::warning('Skip mission notification: template id missing');
            return;
        }

        $recipients = $this->collectRecipients($creator, $mission);
        $scheduleAt = $mission->remind_at ? Carbon::parse($mission->remind_at) : null;

        foreach ($recipients as $recipient) {
            $this->createMissionNotification($recipient, $mission, $creator, $templateId, $scheduleAt);
        }
    }

    protected function collectRecipients(User $creator, Mission $mission): Collection
    {
        return collect([$creator, $mission->owner])
            ->filter(function ($user) {
                return $user && $user->openid;
            })
            ->unique('id');
    }

    protected function createMissionNotification(User $recipient, Mission $mission, User $creator, string $templateId, ?Carbon $scheduleAt = null): void
    {
        $message = $this->getReminderMessage($recipient, $mission, $creator);

        $notification = Notification::create([
            'user_id' => $recipient->id,
            'template_id' => $templateId,
            'status' => 'pending',
            'scheduled_for' => $scheduleAt,
            'payload' => [
                'scene' => 'mission_created',
                'mission_id' => $mission->id,
                'recipient_id' => $recipient->id,
                'data' => $this->buildMissionPayload($mission, $message),
                'page' => sprintf('pages/MissionDetail/index?id=%d', $mission->id),
            ],
        ]);

        if ($this->shouldSendImmediately($scheduleAt)) {
            $this->sendNotification($notification);
        }
    }

    protected function buildMissionPayload(Mission $mission, string $message): array
    {
        $title = Str::limit($mission->title ?? '任务提醒', 20, '...');

        return [
            'thing3' => ['value' => $title],
            'thing9' => ['value' => $message],
        ];
    }

    protected function getReminderMessage(User $recipient, Mission $mission, User $creator): string
    {
        if ($recipient->id === $mission->owner_id) {
            return '别忘了您的待办事项~';
        }

        if ($recipient->id === $creator->id) {
            return '记得提醒对方执行任务~';
        }

        return '别忘了提醒这条任务';
    }

    protected function shouldSendImmediately(?Carbon $scheduleAt): bool
    {
        return !$scheduleAt || $scheduleAt->lessThanOrEqualTo(now());
    }

    public function dispatchDueNotifications(): int
    {
        $dispatched = 0;

        Notification::with('user')
            ->where('status', 'pending')
            ->where(function ($query) {
                $query->whereNull('scheduled_for')
                    ->orWhere('scheduled_for', '<=', now());
            })
            ->chunkById(50, function ($notifications) use (&$dispatched) {
                foreach ($notifications as $notification) {
                    $this->sendNotification($notification);
                    $dispatched++;
                }
            });

        return $dispatched;
    }

    public function sendNotification(Notification $notification): void
    {
        $recipient = $notification->relationLoaded('user') ? $notification->user : $notification->user()->first();

        if (!$recipient || !$recipient->openid) {
            $notification->update([
                'status' => 'failed',
                'payload' => array_merge($notification->payload ?? [], [
                    'error' => 'missing_openid',
                ]),
            ]);
            return;
        }

        $data = $notification->payload['data'] ?? [];
        $page = $notification->payload['page'] ?? null;

        try {
            $response = $this->wechatService->sendSubscribeMessage(
                $recipient->openid,
                $notification->template_id,
                $data,
                $page
            );

            $notification->update([
                'status' => 'sent',
                'sent_at' => now(),
                'payload' => array_merge($notification->payload ?? [], [
                    'response' => $response,
                ]),
            ]);
        } catch (\Throwable $e) {
            $notification->update([
                'status' => 'failed',
                'retry_count' => $notification->retry_count + 1,
                'payload' => array_merge($notification->payload ?? [], [
                    'error' => $e->getMessage(),
                ]),
            ]);

            Log::error('Failed to send notification', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}




