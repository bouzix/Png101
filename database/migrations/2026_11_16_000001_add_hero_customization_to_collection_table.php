<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('Collection')) {
            Schema::table('Collection', function (Blueprint $table) {
                if (!Schema::hasColumn('Collection', 'heroImagePath')) {
                    $table->string('heroImagePath')->nullable()->after('coverImagePath');
                }
                if (!Schema::hasColumn('Collection', 'heroBgColor')) {
                    $table->string('heroBgColor', 32)->nullable()->after('heroImagePath');
                }
                if (!Schema::hasColumn('Collection', 'heroTextColor')) {
                    $table->string('heroTextColor', 32)->nullable()->after('heroBgColor');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('Collection')) {
            Schema::table('Collection', function (Blueprint $table) {
                $cols = [];
                foreach (['heroImagePath', 'heroBgColor', 'heroTextColor'] as $col) {
                    if (Schema::hasColumn('Collection', $col)) {
                        $cols[] = $col;
                    }
                }
                if (!empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }
    }
};
