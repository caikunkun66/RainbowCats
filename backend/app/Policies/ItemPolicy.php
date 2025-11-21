<?php

namespace App\Policies;

use App\Models\Item;
use App\Models\User;

class ItemPolicy
{
    public function view(User $user, Item $item)
    {
        // 允许 admin 查看所有商品
        if ($user->role === 'admin') {
            return true;
        }
        
        // 允许 owner 查看自己的商品
        if ($user->id === $item->owner_id) {
            return true;
        }
        
        // 允许 partner 查看对方创建的商品
        // 检查商品的 owner 是否是当前用户的 partner
        $item->load('owner');
        if ($item->owner && $item->owner->partner_id === $user->id) {
            return true;
        }
        
        // 检查当前用户的 partner 是否是商品的 owner
        $user->load('partner');
        if ($user->partner && $user->partner->id === $item->owner_id) {
            return true;
        }
        
        return false;
    }

    public function update(User $user, Item $item)
    {
        // 只有 owner 或 admin 可以更新
        if ($user->role === 'admin') {
            return true;
        }
        
        return $user->id === $item->owner_id;
    }

    public function delete(User $user, Item $item)
    {
        // 只有 owner 或 admin 可以删除
        return $this->update($user, $item);
    }
}

