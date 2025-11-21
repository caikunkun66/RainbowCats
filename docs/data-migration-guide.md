## 数据迁移指南（微信云数据库 → Laravel + MySQL）

> 目标：把现有微信云开发集合导出为 JSON，然后导入到新的 Laravel 项目（MySQL）。

### 1. 导出云开发集合
1. 登录微信小程序云开发控制台。
2. 对以下集合分别选择“导出 JSON”：
   - `UserList`
   - `MissionList`
   - `MarketList` / `StorageList`（如使用）
3. 将导出的文件放入同一个目录，例如 `exported-data/`，文件命名保持默认（如 `UserList.json`）。

### 2. 准备 Laravel 项目
```bash
cd backend
composer install
cp .env.example .env   # 并填写数据库、Redis、OSS、微信等配置
php artisan key:generate
php artisan migrate
```

### 3. 执行导入命令
Laravel 已提供 `cloud:import` 命令，将数据写入 MySQL：
```bash
php artisan cloud:import exported-data/
```
命令会在一个数据库事务中依次导入：
- 用户（根据 `_openid` 去重）
- 任务（根据 `ownerOpenid/_openid` 找到对应用户）
- 商品（`MarketList` → `items` 表）

### 4. 字段映射规则
| 云开发字段 | MySQL 字段 | 说明 |
| --- | --- | --- |
| `_openid` | `users.openid` | 用于唯一识别用户 |
| `userA/userB` 等昵称 | `users.nickname` | 如缺失则生成占位名 |
| `credit` | `users.credit` | 直接复制积分值 |
| `title` | `missions.title` | 任务标题 |
| `available` | `missions.status` | `true`→`open`，`false`→`finished` |
| `star` | `missions.star` | 星标任务 |
| `credit`（任务奖励） | `missions.reward_credit` | 超出上限会被截断到 9999 |
| `MarketList.cost` | `items.cost_credit` | 商品兑换积分 |

### 5. 失败回滚与日志
- 导入失败会回滚整个事务，终端会显示错误原因。
- 可以反复执行导入命令；`users` 和 `missions` 使用 `updateOrCreate`，不会重复插入。
- 建议在执行前备份数据库（或在空库中运行）。

### 6. 导入后的校验
1. `php artisan tinker` 中检查用户数量、积分总和。
2. 前端调用 `/api/v1/users/me`、`/missions`，验证数据可读。
3. 若需要更多集合，可扩展命令中的解析逻辑。

完成以上步骤后，即可切换微信小程序到新 API，实现与阿里云基础设施的完整对接。该命令位于 `backend/app/Console/Commands/ImportCloudData.php`，可按需调整。

