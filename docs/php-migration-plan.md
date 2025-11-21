# PHP 迁移蓝图（Laravel + 微信小程序）

## 1. 后端初始化
```bash
cd backend
composer create-project laravel/laravel .
php artisan key:generate
php artisan migrate
```

## 2. `.env` 样例
将 `backend/.env.example` 内容复制为 `.env` 并按需调整：
```env
APP_NAME=RainbowCats
APP_ENV=production
APP_KEY=base64:GENERATED_KEY
APP_URL=https://api.your-domain.com
APP_TIMEZONE=Asia/Shanghai

LOG_CHANNEL=stack
LOG_LEVEL=info

DB_CONNECTION=mysql
DB_HOST=rm-xxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_DATABASE=rainbow_cats
DB_USERNAME=rainbow_user
DB_PASSWORD=StrongPassword!

REDIS_HOST=r-xxxx.redis.rds.aliyuncs.com
REDIS_PASSWORD=StrongRedisPassword!
REDIS_PORT=6379

QUEUE_CONNECTION=redis
CACHE_DRIVER=redis
SESSION_DRIVER=redis

OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=rainbow-cats-prod
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com

WECHAT_MINIAPP_APPID=wx1234567890
WECHAT_MINIAPP_SECRET=your-miniapp-secret
WECHAT_SUBSCRIBE_TEMPLATE=z4n_ECy_C4oyEjONAPMOcXjR-aGO4a82mON85GwF7lY
```

## 3. 数据库迁移
关键 migration 文件：`backend/database/migrations/2024_11_20_000000_create_core_tables.php`，涵盖用户、任务、商品、订单、通知、日志等表。

## 4. 核心代码骨架
- `app/Models`: `User`, `Mission`, `Item`, `Order`, `Notification`, `CreditTransaction`
- `app/Http/Controllers`: `AuthController`, `MissionController`, `MarketController`, `NotificationController`
- `app/Services`: 业务层（如 `MissionService`）封装事务逻辑
- `routes/api.php`: 版本化 REST API (`/api/v1/...`)

### 4.1 路由示例
```php
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('users/me', [UserController::class, 'me']);
    Route::apiResource('missions', MissionController::class);
    Route::post('missions/{mission}/complete', [MissionController::class, 'complete']);
    Route::post('missions/{mission}/star', [MissionController::class, 'toggleStar']);
    Route::apiResource('items', ItemController::class)->only(['index', 'show']);
    Route::post('orders', [OrderController::class, 'store']);
    Route::post('notifications/subscribe-status', [NotificationController::class, 'updateStatus']);
});
```

### 4.2 控制器示例
`backend/app/Http/Controllers/MissionController.php` 演示列表、创建、完成任务的核心流程，详见仓库文件。

## 5. 小程序 API SDK
新增 `miniprogram/utils/api.js`，封装访问 Laravel 后端的请求逻辑，包含自动附加 Token、错误处理、典型 `missions` 相关方法。

## 6. 迁移/部署要点
- 使用 `php artisan migrate --seed` 初始化数据
- `php artisan queue:work` 运行在单独容器
- Docker 化：Nginx (80/443) → PHP-FPM → Redis/MySQL/OSS
- GitHub Actions → Aliyun 容器镜像服务 → ECS/ACK 滚动更新

本文档与新增示例代码共同提供一条可执行的 PHP 迁移路径，可直接作为项目重构起点。

