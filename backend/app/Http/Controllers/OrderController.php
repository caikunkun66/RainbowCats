<?php

namespace App\Http\Controllers;

use App\Http\Requests\OrderRequest;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class OrderController extends Controller
{
    protected $service;

    public function __construct(OrderService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        try {
            $orders = Order::query()
                ->with(['item.owner', 'user'])
                ->where('user_id', $request->user()->id)
                ->orderByDesc('created_at')
                ->paginate(20);

            return response()->json($orders);
        } catch (\Exception $e) {
            \Log::error('Order index failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => '获取订单列表失败：' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(Order $order)
    {
        $this->authorize('view', $order);
        
        // 确保加载关联数据
        $order->load(['item.owner', 'user']);
        
        // 手动构建返回数据，确保包含所有关联信息
        return response()->json([
            'id' => $order->id,
            'legacy_id' => $order->legacy_id,
            'item_id' => $order->item_id,
            'user_id' => $order->user_id,
            'credit_cost' => $order->credit_cost,
            'status' => $order->status,
            'available' => $order->available,
            'star' => $order->star,
            'created_at' => $order->created_at,
            'updated_at' => $order->updated_at,
            'item' => $order->item ? [
                'id' => $order->item->id,
                'name' => $order->item->name,
                'description' => $order->item->description,
                'cost_credit' => $order->item->cost_credit,
                'owner' => $order->item->owner ? [
                    'id' => $order->item->owner->id,
                    'openid' => $order->item->owner->openid,
                    'nickname' => $order->item->owner->nickname,
                    'avatar_url' => $order->item->owner->avatar_url,
                ] : null,
            ] : null,
            'user' => $order->user ? [
                'id' => $order->user->id,
                'openid' => $order->user->openid,
                'nickname' => $order->user->nickname,
                'avatar_url' => $order->user->avatar_url,
            ] : null,
        ]);
    }

    public function store(OrderRequest $request)
    {
        $order = $this->service->redeem($request->user(), $request->validated()['item_id']);
        $order->load(['item.owner', 'user']);
        
        // 手动构建返回数据，确保包含所有关联信息
        return response()->json([
            'id' => $order->id,
            'item_id' => $order->item_id,
            'user_id' => $order->user_id,
            'credit_cost' => $order->credit_cost,
            'status' => $order->status,
            'available' => $order->available,
            'star' => $order->star,
            'created_at' => $order->created_at,
            'item' => $order->item ? [
                'id' => $order->item->id,
                'name' => $order->item->name,
                'description' => $order->item->description,
                'cost_credit' => $order->item->cost_credit,
                'owner' => $order->item->owner ? [
                    'id' => $order->item->owner->id,
                    'openid' => $order->item->owner->openid,
                    'nickname' => $order->item->owner->nickname,
                ] : null,
            ] : null,
            'user' => $order->user ? [
                'id' => $order->user->id,
                'openid' => $order->user->openid,
                'nickname' => $order->user->nickname,
            ] : null,
        ], Response::HTTP_CREATED);
    }

    public function use(Request $request, Order $order)
    {
        $this->authorize('update', $order);
        
        if (!$order->available) {
            return response()->json([
                'message' => '物品已被使用',
            ], 400);
        }

        $order->update(['available' => false]);
        $order->load(['item.owner', 'user']);
        
        // 手动构建返回数据，确保包含所有关联信息
        return response()->json([
            'id' => $order->id,
            'item_id' => $order->item_id,
            'user_id' => $order->user_id,
            'credit_cost' => $order->credit_cost,
            'status' => $order->status,
            'available' => $order->available,
            'star' => $order->star,
            'item' => $order->item ? [
                'id' => $order->item->id,
                'name' => $order->item->name,
                'owner' => $order->item->owner ? [
                    'id' => $order->item->owner->id,
                    'openid' => $order->item->owner->openid,
                    'nickname' => $order->item->owner->nickname,
                ] : null,
            ] : null,
            'user' => $order->user ? [
                'id' => $order->user->id,
                'openid' => $order->user->openid,
                'nickname' => $order->user->nickname,
            ] : null,
        ]);
    }

    public function toggleStar(Order $order)
    {
        $this->authorize('update', $order);
        $order->update(['star' => !$order->star]);
        return response()->json(['star' => $order->star]);
    }

    public function destroy(Order $order)
    {
        $this->authorize('delete', $order);
        $order->delete();
        return response()->noContent();
    }
}

