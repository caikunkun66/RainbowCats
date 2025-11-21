<?php

namespace App\Http\Controllers;

use App\Http\Requests\MissionRequest;
use App\Models\Mission;
use App\Services\MissionService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MissionController extends Controller
{
    protected $service;
    protected $notificationService;

    public function __construct(MissionService $service, NotificationService $notificationService)
    {
        $this->service = $service;
        $this->notificationService = $notificationService;
    }

    public function index(Request $request)
    {
        try {
            $user = $request->user()->load('partner');

            // 仅返回当前用户及其已绑定伙伴的任务
            $ownerIds = [$user->id];
            if ($user->partner) {
                $ownerIds[] = $user->partner->id;
            }

            $query = Mission::query()->whereIn('owner_id', $ownerIds);

            if ($request->has('status')) {
                $query->where('status', $request->query('status'));
            }

            if ($request->has('keyword')) {
                $keyword = $request->query('keyword');
                $query->where('title', 'like', "%{$keyword}%");
            }

            $missions = $query->with('owner')->orderByDesc('created_at')->paginate(20);

            return response()->json($missions);
        } catch (\Exception $e) {
            \Log::error('Mission index failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'message' => '获取任务列表失败：' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }

    public function store(MissionRequest $request)
    {
        try {
            $data = $request->validated();
            
            // 如果指定了 owner_openid，查找对应的用户
            $owner = $request->user(); // 默认使用当前用户
            if (isset($data['owner_openid'])) {
                $targetUser = \App\Models\User::where('openid', $data['owner_openid'])->first();
                if (!$targetUser) {
                    return response()->json([
                        'message' => '指定的用户不存在',
                    ], 404);
                }
                $owner = $targetUser;
                unset($data['owner_openid']); // 移除 openid，使用 owner_id
            }
            
            $mission = $this->service->createMission($owner, $data);
            $mission->load('owner');

            $this->notificationService->notifyMissionCreated($request->user(), $mission);

            return response()->json($mission, Response::HTTP_CREATED);
        } catch (\Exception $e) {
            \Log::error('Mission store failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => '创建任务失败：' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(Mission $mission)
    {
        $mission->load('owner');
        $this->authorize('view', $mission);
        return response()->json($mission);
    }

    public function update(MissionRequest $request, Mission $mission)
    {
        $this->authorize('update', $mission);
        $mission = $this->service->updateMission($mission, $request->validated());
        return response()->json($mission);
    }

    public function destroy(Mission $mission)
    {
        $this->authorize('delete', $mission);
        $mission->delete();
        return response()->noContent();
    }

    public function complete(Request $request, Mission $mission)
    {
        $this->authorize('complete', $mission);
        $this->service->completeMission($request->user(), $mission);
        return response()->json(['message' => 'Mission completed']);
    }

    public function toggleStar(Mission $mission)
    {
        $this->authorize('update', $mission);
        $mission->update(['star' => !$mission->star]);
        return response()->json(['star' => $mission->star]);
    }
}

