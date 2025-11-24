@echo off
cd /d C:\RainbowCats\backend
"C:\phpstudy_pro\Extensions\php\php7.3.4nts\php.exe" artisan schedule:run >> storage\logs\schedule.log 2>&1

