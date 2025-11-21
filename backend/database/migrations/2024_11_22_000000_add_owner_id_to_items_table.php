<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddOwnerIdToItemsTable extends Migration
{
    public function up()
    {
        Schema::table('items', function (Blueprint $table) {
            // 先检查字段是否已存在
            if (!Schema::hasColumn('items', 'owner_id')) {
                $table->foreignId('owner_id')->nullable()->after('legacy_id')->constrained('users')->cascadeOnDelete();
            }
        });
    }

    public function down()
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn('owner_id');
        });
    }
}

