<?php

namespace App\Console\Commands;

use App\Models\Item;
use App\Models\Mission;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ImportCloudData extends Command
{
    protected $signature = 'cloud:import {path : Directory containing exported JSON files}';

    protected $description = 'Import WeChat cloud database JSON dumps into MySQL';

    public function handle()
    {
        $directory = $this->argument('path');
        if (! File::isDirectory($directory)) {
            $this->error("Directory not found: {$directory}");
            return self::FAILURE;
        }

        DB::transaction(function () use ($directory) {
            $this->importUsers($directory);
            $this->importMissions($directory);
            $this->importItems($directory);
        });

        $this->info('Import completed ✅');

        return self::SUCCESS;
    }

    protected function readJson(string $directory, string $filename): array
    {
        $path = $directory . DIRECTORY_SEPARATOR . $filename;
        if (! File::exists($path)) {
            $this->warn("Skip missing file: {$filename}");
            return [];
        }

        $content = File::get($path);
        $decoded = json_decode($content, true);
        if (! is_array($decoded)) {
            $this->warn("Invalid JSON: {$filename}");
            return [];
        }

        return $decoded;
    }

    protected function importUsers(string $directory): void
    {
        $records = $this->readJson($directory, 'UserList.json');
        $count = 0;
        foreach ($records as $row) {
            $openid = $row['_openid'] ?? null;
            if (! $openid) {
                continue;
            }

            User::updateOrCreate(
                ['openid' => $openid],
                [
                    'nickname' => $row['user'] ?? $row['name'] ?? 'User_' . Str::random(4),
                    'credit' => (int) ($row['credit'] ?? 0),
                ]
            );
            $count++;
        }
        $this->info("Imported/updated {$count} users");
    }

    protected function importMissions(string $directory): void
    {
        $records = $this->readJson($directory, 'MissionList.json');
        $count = 0;
        foreach ($records as $row) {
            $ownerOpenid = $row['ownerOpenid'] ?? $row['_openid'] ?? null;
            if (! $ownerOpenid) {
                continue;
            }

            $owner = User::firstOrCreate(
                ['openid' => $ownerOpenid],
                ['nickname' => 'User_' . Str::random(4)]
            );

            $legacyId = $row['_id'] ?? (string) Str::uuid();

            Mission::updateOrCreate(
                ['legacy_id' => $legacyId],
                [
                    'legacy_id' => $legacyId,
                    'owner_id' => $owner->id,
                    'title' => $row['title'] ?? '未命名任务',
                    'description' => $row['description'] ?? $row['detail'] ?? null,
                    'reward_credit' => min((int) ($row['credit'] ?? 0), 9999),
                    'status' => ($row['available'] ?? true) ? 'open' : 'finished',
                    'star' => (bool) ($row['star'] ?? false),
                    'due_at' => $row['due_at'] ?? null,
                ]
            );
            $count++;
        }
        $this->info("Imported/updated {$count} missions");
    }

    protected function importItems(string $directory): void
    {
        $records = $this->readJson($directory, 'MarketList.json');
        $count = 0;
        foreach ($records as $row) {
            $legacyId = $row['_id'] ?? (string) Str::uuid();

            Item::updateOrCreate(
                ['legacy_id' => $legacyId],
                [
                    'legacy_id' => $legacyId,
                    'name' => $row['name'] ?? '未命名商品',
                    'description' => $row['description'] ?? null,
                    'cost_credit' => max(1, (int) ($row['cost'] ?? 1)),
                    'stock' => (int) ($row['stock'] ?? 0),
                    'image_url' => $row['image'] ?? null,
                    'status' => ($row['status'] ?? 'active') === 'active' ? 'active' : 'draft',
                ]
            );
            $count++;
        }
        $this->info("Imported/updated {$count} items");
    }
}



