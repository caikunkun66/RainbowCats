<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class UserController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user();

        // 确保始终有邀请码（旧数据没有邀请码时会自动生成）
        $inviteCode = $user->generateInviteCode();

        return response()->json([
            'id' => $user->id,
            'openid' => $user->openid,
            'nickname' => $user->nickname,
            'avatar_url' => $user->avatar_url,
            'role' => $user->role,
            'credit' => $user->credit,
            'invite_code' => $inviteCode,
        ]);
    }

    public function getByOpenid(Request $request, string $openid)
    {
        $user = \App\Models\User::where('openid', $openid)->first();
        
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // 只返回公开信息
        return response()->json([
            'id' => $user->id,
            'openid' => $user->openid,
            'nickname' => $user->nickname,
            'avatar_url' => $user->avatar_url,
            'credit' => $user->credit,
        ]);
    }

    public function getInviteCode(Request $request)
    {
        $user = $request->user();
        $code = $user->generateInviteCode();
        
        return response()->json([
            'invite_code' => $code,
        ]);
    }

    public function bindPartner(Request $request)
    {
        $request->validate([
            'invite_code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();
        $inviteCode = strtoupper($request->input('invite_code'));

        // 不能绑定自己
        if ($user->invite_code === $inviteCode) {
            return response()->json([
                'message' => '不能使用自己的邀请码',
            ], 400);
        }

        // 查找邀请码对应的用户
        $partner = \App\Models\User::where('invite_code', $inviteCode)->first();

        if (!$partner) {
            return response()->json([
                'message' => '邀请码无效',
            ], 404);
        }

        // 检查是否已经绑定
        if ($user->partner_id) {
            return response()->json([
                'message' => '您已经绑定了伙伴',
            ], 400);
        }

        if ($partner->partner_id) {
            return response()->json([
                'message' => '对方已经绑定了其他用户',
            ], 400);
        }

        // 双向绑定
        $user->update(['partner_id' => $partner->id]);
        $partner->update(['partner_id' => $user->id]);

        return response()->json([
            'message' => '绑定成功',
            'partner' => [
                'id' => $partner->id,
                'nickname' => $partner->nickname,
                'avatar_url' => $partner->avatar_url,
                'credit' => $partner->credit,
            ],
        ]);
    }

    public function getPartner(Request $request)
    {
        $user = $request->user()->load('partner');
        
        if (!$user->partner) {
            return response()->json([
                'partner' => null,
            ]);
        }

        return response()->json([
            'partner' => [
                'id' => $user->partner->id,
                'openid' => $user->partner->openid,
                'nickname' => $user->partner->nickname,
                'avatar_url' => $user->partner->avatar_url,
                'credit' => $user->partner->credit,
            ],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'nickname' => ['required', 'string', 'max:50'],
        ]);

        $user = $request->user();
        $user->update(['nickname' => $validated['nickname']]);

        return response()->json([
            'message' => '更新成功',
            'user' => [
                'id' => $user->id,
                'openid' => $user->openid,
                'nickname' => $user->nickname,
                'credit' => $user->credit,
            ],
        ]);
    }
}



