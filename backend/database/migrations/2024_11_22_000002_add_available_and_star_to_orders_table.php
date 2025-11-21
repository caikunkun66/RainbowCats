<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAvailableAndStarToOrdersTable extends Migration
{
    public function up()
    {
        Schema::table('orders', function (Blueprint $table) {
            // 先检查字段是否已存在
            if (!Schema::hasColumn('orders', 'available')) {
                $table->boolean('available')->default(true)->after('status');
            }
            if (!Schema::hasColumn('orders', 'star')) {
                $table->boolean('star')->default(false)->after('available');
            }
        });
    }

    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'star')) {
                $table->dropColumn('star');
            }
            if (Schema::hasColumn('orders', 'available')) {
                $table->dropColumn('available');
            }
        });
    }
}


