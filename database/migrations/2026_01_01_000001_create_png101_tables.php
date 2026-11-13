<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('Image')) {
            Schema::create('Image', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('filename');
                $table->string('path');
                $table->string('previewPath')->nullable();
                $table->string('name')->nullable();
                $table->text('description')->nullable();
                $table->string('altText')->nullable();
                $table->json('tags')->nullable();
                $table->string('status')->default('draft');
                $table->integer('width')->nullable();
                $table->integer('height')->nullable();
                $table->integer('size')->nullable();
                $table->string('mimeType')->nullable();
                $table->string('luminance')->nullable();
                $table->string('contrastBgDark')->nullable();
                $table->string('contrastBgLight')->nullable();
                $table->dateTime('createdAt')->useCurrent();
                $table->dateTime('updatedAt')->useCurrent()->useCurrentOnUpdate();
            });
        }

        if (!Schema::hasTable('Category')) {
            Schema::create('Category', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('name');
                $table->string('slug')->unique();
                $table->text('description')->nullable();
                $table->dateTime('createdAt')->useCurrent();
                $table->dateTime('updatedAt')->useCurrent()->useCurrentOnUpdate();
                $table->string('parentId', 36)->nullable();

                $table->foreign('parentId')->references('id')->on('Category')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('ImageCategory')) {
            Schema::create('ImageCategory', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('imageId', 36);
                $table->string('categoryId', 36);
                $table->dateTime('createdAt')->useCurrent();

                $table->unique(['imageId', 'categoryId']);
                $table->index('imageId');
                $table->index('categoryId');
                $table->foreign('imageId')->references('id')->on('Image')->onDelete('cascade');
                $table->foreign('categoryId')->references('id')->on('Category')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('Download')) {
            Schema::create('Download', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('imageId', 36)->nullable();
                $table->dateTime('createdAt')->useCurrent();
                $table->string('deviceType')->nullable();
                $table->string('country')->nullable();
                $table->string('countryName')->nullable();
                $table->boolean('isCustomSize')->default(false);
                $table->string('resolution')->nullable();

                $table->index('imageId');
                $table->index('createdAt');
                $table->index('deviceType');
                $table->index('country');
                $table->foreign('imageId')->references('id')->on('Image')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('ImageView')) {
            Schema::create('ImageView', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('imageId', 36);
                $table->dateTime('createdAt')->useCurrent();

                $table->index('imageId');
                $table->index('createdAt');
                $table->foreign('imageId')->references('id')->on('Image')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('SearchLog')) {
            Schema::create('SearchLog', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('query');
                $table->integer('resultsCount')->default(0);
                $table->dateTime('createdAt')->useCurrent();

                $table->index('query');
                $table->index('createdAt');
                $table->index('resultsCount');
            });
        }

        if (!Schema::hasTable('Setting')) {
            Schema::create('Setting', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->text('value');
            });
        }

        if (!Schema::hasTable('ApiKey')) {
            Schema::create('ApiKey', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('name');
                $table->string('key');
                $table->string('modelVersion')->default('2.5');
                $table->boolean('isActive')->default(false);
                $table->dateTime('createdAt')->useCurrent();
                $table->dateTime('updatedAt')->useCurrent()->useCurrentOnUpdate();
            });
        }

        if (!Schema::hasTable('CodeInjection')) {
            Schema::create('CodeInjection', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->text('headCode')->nullable();
                $table->text('bodyCode')->nullable();
                $table->text('footerCode')->nullable();
                $table->dateTime('updatedAt')->useCurrent()->useCurrentOnUpdate();
            });
        }

        if (!Schema::hasTable('WebsiteInfo')) {
            Schema::create('WebsiteInfo', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('websiteName')->default('Png101');
                $table->string('websiteUrl')->default('https://png101.com');
                $table->text('tagline')->nullable();
                $table->string('contactEmail')->default('contact@png101.com');
                $table->string('dmcaEmail')->default('dmca@png101.com');
                $table->string('companyName')->default('Png101');
                $table->string('country')->default('United States');
                $table->text('address')->nullable();
                $table->string('foundedYear')->default('2025');
                $table->dateTime('updatedAt')->useCurrent()->useCurrentOnUpdate();
            });
        }

        if (!Schema::hasTable('SeoSetting')) {
            Schema::create('SeoSetting', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->boolean('autoRegenerate')->default(true);
                $table->string('scheduleFrequency')->default('daily');
                $table->string('scheduleTime')->default('00:00');
                $table->integer('scheduleDayOfWeek')->default(1);
                $table->integer('scheduleDayOfMonth')->default(1);
                $table->boolean('disallowAdminInRobots')->default(true);
                $table->boolean('includeImageXml')->default(true);
                $table->boolean('includeLlmsTxt')->default(true);
                $table->boolean('includeManifest')->default(true);
                $table->text('customRobotsRules')->nullable();
                $table->dateTime('lastGeneratedAt')->nullable();
                $table->string('lastGeneratedTrigger')->nullable();
                $table->text('lastStatsJson')->nullable();
                $table->dateTime('updatedAt')->useCurrent()->useCurrentOnUpdate();
            });
        }

        if (!Schema::hasTable('TeamMember')) {
            Schema::create('TeamMember', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('name');
                $table->string('email')->unique();
                $table->string('passwordHash');
                $table->json('permissions');
                $table->boolean('isActive')->default(true);
                $table->dateTime('lastLoginAt')->nullable();
                $table->dateTime('createdAt')->useCurrent();
                $table->dateTime('updatedAt')->useCurrent()->useCurrentOnUpdate();
            });
        }

        if (!Schema::hasTable('Collection')) {
            Schema::create('Collection', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('name');
                $table->string('slug')->unique();
                $table->text('description')->nullable();
                $table->string('coverImageId', 36)->nullable();
                $table->string('coverImagePath')->nullable();
                $table->string('type')->default('manual');
                $table->json('tagRules')->nullable();
                $table->string('ruleMatchMode')->default('any');
                $table->boolean('isFeatured')->default(false);
                $table->string('status')->default('published');
                $table->integer('order')->default(0);
                $table->integer('viewsCount')->default(0);
                $table->integer('downloadsCount')->default(0);
                $table->dateTime('createdAt')->useCurrent();
                $table->dateTime('updatedAt')->useCurrent()->useCurrentOnUpdate();

                $table->index('slug');
                $table->index('isFeatured');
                $table->index('status');
            });
        }

        if (!Schema::hasTable('CollectionImage')) {
            Schema::create('CollectionImage', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('collectionId', 36);
                $table->string('imageId', 36);
                $table->integer('position')->default(0);
                $table->boolean('isPinned')->default(false);
                $table->boolean('isExcluded')->default(false);
                $table->dateTime('createdAt')->useCurrent();

                $table->unique(['collectionId', 'imageId']);
                $table->index('collectionId');
                $table->index('imageId');
                $table->foreign('collectionId')->references('id')->on('Collection')->onDelete('cascade');
                $table->foreign('imageId')->references('id')->on('Image')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('CollectionImage');
        Schema::dropIfExists('Collection');
        Schema::dropIfExists('TeamMember');
        Schema::dropIfExists('SeoSetting');
        Schema::dropIfExists('WebsiteInfo');
        Schema::dropIfExists('CodeInjection');
        Schema::dropIfExists('ApiKey');
        Schema::dropIfExists('Setting');
        Schema::dropIfExists('SearchLog');
        Schema::dropIfExists('ImageView');
        Schema::dropIfExists('Download');
        Schema::dropIfExists('ImageCategory');
        Schema::dropIfExists('Category');
        Schema::dropIfExists('Image');
    }
};

