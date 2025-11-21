<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WeChatAuthService
{
    protected $appId;
    protected $appSecret;

    public function __construct()
    {
        $this->appId = config('services.wechat.miniapp.app_id');
        $this->appSecret = config('services.wechat.miniapp.secret');

        if (empty($this->appId) || empty($this->appSecret)) {
            throw new \Exception('微信小程序配置未设置，请在 .env 文件中配置 WECHAT_MINIAPP_APPID 和 WECHAT_MINIAPP_SECRET');
        }
    }

    public function loginWithCode(string $code, ?string $nickname = null): array
    {
        // Exchange code for openid and session_key
        $session = $this->code2Session($code);

        if (!isset($session['openid'])) {
            throw new \Exception('Failed to get openid from WeChat');
        }

        // Find or create user
        $user = User::firstOrCreate(
            ['openid' => $session['openid']],
            [
                'nickname' => $nickname ?? '微信用户',
                'credit' => 0,
            ]
        );

        // Create token
        $token = $user->createToken('miniapp')->plainTextToken;

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'openid' => $user->openid,
                'nickname' => $user->nickname,
                'credit' => $user->credit,
            ],
        ];
    }

    protected function code2Session(string $code): array
    {
        $url = 'https://api.weixin.qq.com/sns/jscode2session';
        $params = [
            'appid' => $this->appId,
            'secret' => $this->appSecret,
            'js_code' => $code,
            'grant_type' => 'authorization_code',
        ];

        $response = Http::get($url, $params);

        if (!$response->successful()) {
            Log::error('WeChat code2session failed', [
                'code' => $code,
                'response' => $response->body(),
            ]);
            throw new \Exception('WeChat API request failed');
        }

        $data = $response->json();

        if (isset($data['errcode']) && $data['errcode'] !== 0) {
            Log::error('WeChat code2session error', $data);
            throw new \Exception($data['errmsg'] ?? 'WeChat API error');
        }

        return $data;
    }
}

