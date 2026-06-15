@echo off
cd /d D:\OtherProject\RainbowCats\backend
php artisan schedule:run >> storage\logs\schedule.log 2>&1

