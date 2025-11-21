<?php

namespace App\Policies;

use App\Models\Mission;
use App\Models\User;

class MissionPolicy
{
    public function view(User $user, Mission $mission)
    {
        // 允许 admin 查看所有任务
        if ($user->role === 'admin') {
            return true;
        }
        
        // 允许 owner 查看自己的任务
        if ($user->id === $mission->owner_id) {
            return true;
        }
        
        // 允许 partner 查看对方创建的任务
        // 检查任务的 owner 是否是当前用户的 partner
        $mission->load('owner');
        if ($mission->owner && $mission->owner->partner_id === $user->id) {
            return true;
        }
        
        // 检查当前用户的 partner 是否是任务的 owner
        $user->load('partner');
        if ($user->partner && $user->partner->id === $mission->owner_id) {
            return true;
        }
        
        return false;
    }

    public function update(User $user, Mission $mission)
    {
        return $this->view($user, $mission);
    }

    public function delete(User $user, Mission $mission)
    {
        return $this->update($user, $mission);
    }

    public function complete(User $user, Mission $mission)
    {
        return $user->id !== $mission->owner_id;
    }
}



