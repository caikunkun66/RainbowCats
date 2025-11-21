<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'item_id',
        'user_id',
        'credit_cost',
        'status',
        'available',
        'star',
    ];

    protected $casts = [
        'available' => 'boolean',
        'star' => 'boolean',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}



