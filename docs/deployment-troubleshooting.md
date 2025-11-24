# 宝塔面板部署故障排除指南

## ERR_CONNECTION_RESET 错误排查

当在宝塔面板部署 Laravel 后端后出现 `ERR_CONNECTION_RESET` 错误时，请按以下步骤排查：

### 1. TrustProxies 中间件配置 ✅ (已修复)

已修复 `backend/app/Http/Middleware/TrustProxies.php`，将 `$proxies` 设置为 `'*'` 以信任所有代理。

### 2. 检查 Nginx 配置

在宝塔面板中，确保 Nginx 配置正确：

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name caikunkun.icu;
    
    # SSL 证书配置（如果使用 HTTPS）
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    root /www/wwwroot/your-project/backend/public;
    index index.php index.html;
    
    # 重要：传递正确的代理头
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/tmp/php-cgi-74.sock;  # 根据你的 PHP 版本调整
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        
        # 重要：传递代理头信息
        fastcgi_param HTTP_X_FORWARDED_PROTO $scheme;
        fastcgi_param HTTP_X_FORWARDED_FOR $proxy_add_x_forwarded_for;
        fastcgi_param HTTP_X_REAL_IP $remote_addr;
    }
}
```

### 3. 检查 Laravel .env 配置

确保服务器上的 `.env` 文件配置正确：

```env
APP_URL=https://caikunkun.icu
APP_ENV=production
APP_DEBUG=false

# 数据库配置
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### 4. 检查 SSL 证书

如果使用 HTTPS：

1. **验证证书是否有效**：
   ```bash
   openssl s_client -connect caikunkun.icu:443 -servername caikunkun.icu
   ```

2. **在宝塔面板中**：
   - 进入网站设置 → SSL
   - 确保已正确安装 SSL 证书
   - 检查证书是否过期

3. **如果证书有问题**，可以临时使用 HTTP 测试：
   - 修改 `miniprogram/utils/api.js` 中的 `BASE_URL` 为 `http://caikunkun.icu/api/v1`
   - 在微信小程序后台配置合法域名时，需要同时配置 HTTP 域名

### 5. 检查防火墙设置

在宝塔面板中：

1. **安全 → 防火墙**：
   - 确保 80 端口（HTTP）已开放
   - 确保 443 端口（HTTPS）已开放

2. **云服务器安全组**（如果使用云服务器）：
   - 确保在云服务商控制台开放 80 和 443 端口

### 6. 检查 PHP-FPM 配置

1. **PHP 版本**：确保使用 PHP 7.4 或更高版本
2. **PHP-FPM 状态**：在宝塔面板中检查 PHP-FPM 是否正常运行
3. **错误日志**：查看 `/www/wwwroot/your-project/backend/storage/logs/laravel.log`

### 7. 检查文件权限

在服务器上执行：

```bash
cd /www/wwwroot/your-project/backend
chmod -R 755 storage bootstrap/cache
chown -R www:www storage bootstrap/cache
```

### 8. 清除 Laravel 缓存

在服务器上执行：

```bash
cd /www/wwwroot/your-project/backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

### 9. 测试 API 端点

在服务器上测试 API 是否正常：

```bash
# 测试登录接口
curl -X POST https://caikunkun.icu/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code":"test_code"}'

# 测试用户信息接口（需要 token）
curl -X GET https://caikunkun.icu/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 10. 微信小程序域名配置

在微信小程序后台：

1. **开发 → 开发管理 → 开发设置 → 服务器域名**
2. 确保已添加：
   - `request合法域名`：`https://caikunkun.icu`
   - `uploadFile合法域名`：`https://caikunkun.icu`（如果需要）
   - `downloadFile合法域名`：`https://caikunkun.icu`（如果需要）

### 11. 常见问题

#### 问题：SSL 证书不受信任
**解决**：使用 Let's Encrypt 免费证书（宝塔面板可以自动申请）

#### 问题：Nginx 502 Bad Gateway
**解决**：
- 检查 PHP-FPM 是否运行
- 检查 PHP-FPM 监听地址是否正确
- 查看 Nginx 错误日志：`/www/wwwlogs/error.log`

#### 问题：请求超时
**解决**：
- 增加 Nginx 超时时间
- 增加 PHP-FPM 超时时间
- 检查服务器资源使用情况

### 12. 调试步骤

1. **查看 Nginx 错误日志**：
   ```bash
   tail -f /www/wwwlogs/error.log
   ```

2. **查看 Laravel 日志**：
   ```bash
   tail -f /www/wwwroot/your-project/backend/storage/logs/laravel.log
   ```

3. **临时启用调试模式**（仅用于调试）：
   ```env
   APP_DEBUG=true
   ```
   注意：调试完成后务必改回 `false`

### 13. 验证修复

修复后，在微信开发者工具中：
1. 清除缓存
2. 重新编译
3. 查看控制台是否还有错误

如果问题仍然存在，请检查：
- 服务器是否能正常访问
- DNS 解析是否正确
- 是否有 CDN 或防火墙拦截

