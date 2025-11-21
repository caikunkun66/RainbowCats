<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Mission extends Model
{
    protected $table = 'missions';
    protected $fillable = [
        'legacy_id',
        'owner_id',
        'title',
        'description',
        'reward_credit',
        'status',
        'star',
        'due_at',
    ];

    protected $casts = [
        'star' => 'boolean',
        'due_at' => 'datetime',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function logs()
    {
        return $this->hasMany(MissionLog::class);
    }
}



