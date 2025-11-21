<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function redeem(User $user, int $itemId): Order
    {
        return DB::transaction(function () use ($user, $itemId) {
            $item = Item::query()->lockForUpdate()->findOrFail($itemId);

            if ($item->status !== 'active') {
                throw ValidationException::withMessages(['item_id' => 'Item not available']);
            }

            if ($item->stock < 1) {
                throw ValidationException::withMessages(['item_id' => 'Item out of stock']);
            }

            if ($user->credit < $item->cost_credit) {
                throw ValidationException::withMessages(['credit' => 'Insufficient credit']);
            }

            $item->decrement('stock');
            $user->decrement('credit', $item->cost_credit);

            // 如果库存为 0，将商品状态改为 archived（已下架）
            if ($item->fresh()->stock <= 0) {
                $item->update(['status' => 'archived']);
            }

            return Order::create([
                'item_id' => $item->id,
                'user_id' => $user->id,
                'credit_cost' => $item->cost_credit,
                'status' => 'pending',
                'available' => true, // 新购买的订单默认为可用
                'star' => false,
            ]);
        });
    }
}



