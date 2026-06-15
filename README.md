# RainbowCats - 彩虹喵微信小程序

> 致谢：https://github.com/UxxHans/Rainbow-Cats-Personal-WeChat-MiniProgram

## 项目简介

彩虹喵是一个微信小程序项目，包含任务管理、物品兑换、订单系统、积分系统和微信订阅消息推送等功能。

- `miniprogram/` - 微信小程序前端
- `backend/` - Laravel PHP 后端 API 服务

---

## 后端项目启动指南

### 环境要求

- PHP >= 7.2.5
- MySQL 数据库
- Composer（PHP 包管理器）
- npm（可选，前端资源编译时需要）

### 快速启动

```bash
# 1. 进入后端目录
cd backend

# 2. 安装 PHP 依赖
composer install

# 3. 生成应用密钥
php artisan key:generate

# 4. 运行数据库迁移（确保 MySQL 已启动，并创建好对应数据库）
php artisan migrate

# 5. 启动开发服务器
php artisan serve
```

启动后，开发服务器默认运行在 `http://localhost:8000`。

- Web 首页：`http://localhost:8000`
- API 接口：`http://localhost:8000/api/v1/...`

如需指定端口：
```bash
php artisan serve --port=8080
```

### 环境配置

项目使用 `.env` 文件管理环境变量。`backend/.env.example` 为模板文件，如需重新配置：

```bash
copy .env.example .env   # Windows
cp .env.example .env     # Linux/Mac
```

主要配置项：
- `DB_*` - 数据库连接信息（MySQL）
- `WECHAT_MINIAPP_APPID` / `WECHAT_MINIAPP_SECRET` - 微信小程序密钥
- `WECHAT_SUBSCRIBE_TEMPLATE` - 微信订阅消息模板 ID

### 定时任务配置（微信订阅消息推送）

项目包含 `notifications:dispatch-due` 定时命令，每分钟检查并发送到期通知。

**Linux/Mac（crontab）：**
```cron
* * * * * cd /path-to-project && php artisan schedule:run >> storage/logs/schedule.log 2>&1
```

**Windows（任务计划程序）：**
将 `backend/run-schedule.bat` 加入 Windows 任务计划程序，设置每分钟运行一次。

---

## 主要 API 路由

所有 API 前缀为 `/api/v1/`，除登录接口外均需 Sanctum Token 认证：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/login` | 微信登录 |
| GET | `/api/v1/users/me` | 获取当前用户信息 |
| PUT | `/api/v1/users/me` | 更新用户资料 |
| GET | `/api/v1/missions` | 任务列表 |
| POST | `/api/v1/items` | 创建物品 |
| GET | `/api/v1/orders` | 订单列表 |
