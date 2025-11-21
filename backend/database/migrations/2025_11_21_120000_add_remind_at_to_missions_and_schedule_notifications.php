<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddRemindAtToMissionsAndScheduleNotifications extends Migration
{
    public function up()
    {
        Schema::table('missions', function (Blueprint $table) {
            $table->timestamp('remind_at')->nullable()->after('due_at');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->timestamp('scheduled_for')->nullable()->after('status');
            $table->index('scheduled_for');
        });
    }

    public function down()
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['scheduled_for']);
            $table->dropColumn('scheduled_for');
        });

        Schema::table('missions', function (Blueprint $table) {
            $table->dropColumn('remind_at');
        });
    }
}


