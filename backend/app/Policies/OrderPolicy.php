<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function view(User $user, Order $order)
    {
        // 只有订单所有者可以查看
        return $user->id === $order->user_id;
    }

    public function update(User $user, Order $order)
    {
        // 只有订单所有者可以更新
        return $user->id === $order->user_id;
    }

    public function delete(User $user, Order $order)
    {
        // 只有订单所有者可以删除
        return $user->id === $order->user_id;
    }
}


