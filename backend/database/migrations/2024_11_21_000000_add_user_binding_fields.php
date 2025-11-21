<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddUserBindingFields extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('partner_id')->nullable()->after('credit')->constrained('users')->nullOnDelete();
            $table->string('invite_code')->nullable()->unique()->after('partner_id');
            $table->index('invite_code');
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['partner_id']);
            $table->dropColumn(['partner_id', 'invite_code']);
        });
    }
}

