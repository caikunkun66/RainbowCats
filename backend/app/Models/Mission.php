<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'remind_at',
    ];

    protected $casts = [
        'star' => 'boolean',
        'due_at' => 'datetime',
        'remind_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::deleting(function (Mission $mission) {
            Notification::where('status', 'pending')
                ->where('payload->mission_id', $mission->id)
                ->delete();
        });
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function logs()
    {
        return $this->hasMany(MissionLog::class);
    }
}