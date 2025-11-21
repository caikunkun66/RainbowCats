<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddStarToItemsTable extends Migration
{
    public function up()
    {
        Schema::table('items', function (Blueprint $table) {
            // 先检查字段是否已存在
            if (!Schema::hasColumn('items', 'star')) {
                $table->boolean('star')->default(false)->after('status');
            }
        });
    }

    public function down()
    {
        Schema::table('items', function (Blueprint $table) {
            if (Schema::hasColumn('items', 'star')) {
                $table->dropColumn('star');
            }
        });
    }
}

