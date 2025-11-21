<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WeChatSubscribeMessageService
{
    /**
     * @var string
     */
    protected $appId;

    /**
     * @var string
     */
    protected $appSecret;

    /**
     * @var string
     */
    protected $tokenCacheKey = 'wechat:miniapp:access_token';

    public function __construct()
    {
        $this->appId = config('services.wechat.miniapp.app_id');
        $this->appSecret = config('services.wechat.miniapp.secret');

        if (empty($this->appId) || empty($this->appSecret)) {
            throw new \RuntimeException('微信小程序凭证未配置');
        }
    }

    public function sendSubscribeMessage(string $openid, string $templateId, array $data, ?string $page = null): array
    {
        $payload = array_filter([
            'touser' => $openid,
            'template_id' => $templateId,
            'page' => $page,
            'data' => $data,
        ], function ($value) {
            return $value !== null;
        });

        return $this->postWithToken('https://api.weixin.qq.com/cgi-bin/message/subscribe/send', $payload);
    }

    protected function postWithToken(string $url, array $payload, bool $retried = false): array
    {
        $token = $this->getAccessToken($retried);
        $response = Http::post(sprintf('%s?access_token=%s', $url, $token), $payload);

        if (!$response->successful()) {
            Log::error('WeChat API request failed', [
                'url' => $url,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException('微信接口请求失败');
        }

        $data = $response->json();
        $errCode = $data['errcode'] ?? 0;

        if ($errCode === 0) {
            return $data;
        }

        // token invalid, retry once after refreshing
        if (in_array($errCode, [40001, 42001], true) && !$retried) {
            Cache::forget($this->tokenCacheKey);
            return $this->postWithToken($url, $payload, true);
        }

        Log::warning('WeChat API responded with error', $data);
        throw new \RuntimeException($data['errmsg'] ?? '微信接口返回错误');
    }

    protected function getAccessToken(bool $forceRefresh = false): string
    {
        if (!$forceRefresh && Cache::has($this->tokenCacheKey)) {
            return Cache::get($this->tokenCacheKey);
        }

        $response = Http::get('https://api.weixin.qq.com/cgi-bin/token', [
            'grant_type' => 'client_credential',
            'appid' => $this->appId,
            'secret' => $this->appSecret,
        ]);

        if (!$response->successful()) {
            Log::error('Failed to fetch WeChat access_token', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException('拉取微信 access_token 失败');
        }

        $data = $response->json();
        if (!isset($data['access_token'])) {
            Log::error('WeChat access_token missing', $data);
            throw new \RuntimeException('微信 access_token 响应异常');
        }

        $expiresIn = (int) ($data['expires_in'] ?? 7200);
        Cache::put($this->tokenCacheKey, $data['access_token'], $expiresIn - 60);

        return $data['access_token'];
    }
}


