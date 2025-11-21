<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user()->load('partner');

        // 仅允许查看自己和已绑定伙伴的商品
        $ownerIds = [$user->id];
        if ($user->partner) {
            $ownerIds[] = $user->partner->id;
        }

        $items = Item::query()
            ->with('owner')
            // 返回 active 和 archived 状态的商品（不返回 draft）
            ->whereIn('status', ['active', 'archived'])
            ->whereIn('owner_id', $ownerIds)
            ->when($request->query('keyword'), function ($query, $keyword) {
                return $query->where('name', 'like', '%' . $keyword . '%');
            })
            ->orderBy('name')
            ->paginate(20);

        return response()->json($items);
    }

    public function show(Item $item)
    {
        $item->load(['owner', 'orders.user']);
        
        // 获取最新的订单（如果有）
        $latestOrder = $item->orders()->with('user')->latest()->first();
        
        // 手动构建返回数据，确保包含所有关联信息
        $data = [
            'id' => $item->id,
            'legacy_id' => $item->legacy_id,
            'owner_id' => $item->owner_id,
            'name' => $item->name,
            'description' => $item->description,
            'cost_credit' => $item->cost_credit,
            'stock' => $item->stock,
            'image_url' => $item->image_url,
            'status' => $item->status,
            'star' => $item->star,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
            'owner' => $item->owner ? [
                'id' => $item->owner->id,
                'openid' => $item->owner->openid,
                'nickname' => $item->owner->nickname,
                'avatar_url' => $item->owner->avatar_url,
            ] : null,
        ];
        
        // 如果商品已被购买，包含订单信息
        if ($latestOrder) {
            $data['order'] = [
                'id' => $latestOrder->id,
                'user' => $latestOrder->user ? [
                    'id' => $latestOrder->user->id,
                    'openid' => $latestOrder->user->openid,
                    'nickname' => $latestOrder->user->nickname,
                    'avatar_url' => $latestOrder->user->avatar_url,
                ] : null,
            ];
        }
        
        return response()->json($data);
    }

    public function toggleStar(Item $item)
    {
        $this->authorize('update', $item);
        $item->update(['star' => !$item->star]);
        return response()->json(['star' => $item->star]);
    }

    public function destroy(Item $item)
    {
        $this->authorize('delete', $item);
        $item->delete();
        return response()->noContent();
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:120'],
                'description' => ['nullable', 'string'],
                'cost_credit' => ['required', 'integer', 'min:1', 'max:9999'],
                'image_url' => ['nullable', 'string'],
            ]);

            $itemData = array_merge($validated, [
                'owner_id' => $request->user()->id,
                'status' => 'active',
                'stock' => 1, // 默认库存为1
            ]);

            $item = Item::create($itemData);
            $item->load('owner');

            return response()->json($item, 201);
        } catch (\Exception $e) {
            \Log::error('Item store failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'message' => '创建商品失败：' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }
}

