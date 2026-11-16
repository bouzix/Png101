<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('EditorTemplateCategory')) {
            Schema::create('EditorTemplateCategory', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('name', 120);
                $table->string('slug', 140)->unique('EditorTemplateCategory_slug_unique');
                $table->text('description')->nullable();
                $table->string('icon', 60)->nullable();
                $table->integer('sortOrder')->default(0);
                $table->boolean('isActive')->default(true);
                $table->dateTime('createdAt')->nullable();
                $table->dateTime('updatedAt')->nullable();
            });
        }

        if (!Schema::hasTable('EditorTemplate')) {
            Schema::create('EditorTemplate', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('title', 180);
                $table->string('slug', 200)->unique('EditorTemplate_slug_unique');
                $table->text('description')->nullable();
                $table->string('categoryId', 36)->nullable()->index('EditorTemplate_categoryId_idx');
                $table->integer('width')->default(1080);
                $table->integer('height')->default(1080);
                $table->string('presetLabel', 120)->nullable();
                $table->longText('pagesJson');
                $table->longText('thumbnailPath')->nullable();
                $table->text('tags')->nullable();
                $table->boolean('isFeatured')->default(false)->index('EditorTemplate_isFeatured_idx');
                $table->string('status', 24)->default('published')->index('EditorTemplate_status_idx');
                $table->integer('usageCount')->default(0);
                $table->string('createdBy', 120)->nullable();
                $table->dateTime('createdAt')->nullable();
                $table->dateTime('updatedAt')->nullable();
            });
        }

        if (!Schema::hasTable('EditorCanvasPreset')) {
            Schema::create('EditorCanvasPreset', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('name', 120);
                $table->string('groupName', 64)->default('Social')->index('EditorCanvasPreset_groupName_idx');
                $table->integer('width');
                $table->integer('height');
                $table->string('icon', 60)->nullable();
                $table->integer('sortOrder')->default(0);
                $table->boolean('isActive')->default(true);
                $table->dateTime('createdAt')->nullable();
                $table->dateTime('updatedAt')->nullable();
            });
        }

        if (!Schema::hasTable('EditorFont')) {
            Schema::create('EditorFont', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('family', 140);
                $table->string('source', 24)->default('google'); // google | custom | system
                $table->text('weights')->nullable();
                $table->text('googleImportUrl')->nullable();
                $table->text('filePath')->nullable();
                $table->boolean('isActive')->default(true);
                $table->integer('sortOrder')->default(0);
                $table->dateTime('createdAt')->nullable();
                $table->dateTime('updatedAt')->nullable();
            });
        }

        if (!Schema::hasTable('EditorUsageLog')) {
            Schema::create('EditorUsageLog', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('eventType', 32)->index('EditorUsageLog_eventType_idx');
                $table->string('templateId', 36)->nullable()->index('EditorUsageLog_templateId_idx');
                $table->string('imageId', 36)->nullable()->index('EditorUsageLog_imageId_idx');
                $table->string('searchQuery', 255)->nullable()->index('EditorUsageLog_searchQuery_idx');
                $table->integer('resultCount')->nullable();
                $table->string('format', 16)->nullable();
                $table->integer('width')->nullable();
                $table->integer('height')->nullable();
                $table->integer('pageCount')->default(1);
                $table->string('deviceType', 24)->nullable();
                $table->string('ipAddress', 64)->nullable();
                $table->dateTime('createdAt')->index('EditorUsageLog_createdAt_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('EditorUsageLog');
        Schema::dropIfExists('EditorFont');
        Schema::dropIfExists('EditorCanvasPreset');
        Schema::dropIfExists('EditorTemplate');
        Schema::dropIfExists('EditorTemplateCategory');
    }
};
