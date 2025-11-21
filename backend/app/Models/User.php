<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'openid',
        'nickname',
        'avatar_url',
        'role',
        'credit',
        'settings',
        'partner_id',
        'invite_code',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    public function missions()
    {
        return $this->hasMany(Mission::class, 'owner_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function partner()
    {
        return $this->belongsTo(User::class, 'partner_id');
    }

    public function generateInviteCode(): string
    {
        if ($this->invite_code) {
            return $this->invite_code;
        }

        // 生成6位随机邀请码
        do {
            $code = strtoupper(substr(md5($this->id . $this->openid . time()), 0, 6));
        } while (self::where('invite_code', $code)->exists());

        $this->update(['invite_code' => $code]);
        return $code;
    }

    protected static function boot()
    {
        parent::boot();

        // 创建用户后自动生成邀请码
        static::created(function ($user) {
            $user->generateInviteCode();
        });
    }
}



