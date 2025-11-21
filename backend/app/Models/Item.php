<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $fillable = [
        'legacy_id',
        'owner_id',
        'name',
        'description',
        'cost_credit',
        'stock',
        'image_url',
        'status',
        'star',
    ];

    protected $casts = [
        'cost_credit' => 'integer',
        'stock' => 'integer',
        'star' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}



