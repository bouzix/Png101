/*
  Warnings:

  - You are about to drop the column `categoryId` on the `image` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `image` DROP FOREIGN KEY `Image_categoryId_fkey`;

-- AlterTable
ALTER TABLE `image` DROP COLUMN `categoryId`;

-- CreateTable
CREATE TABLE `ImageCategory` (
    `id` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImageCategory_imageId_idx`(`imageId`),
    INDEX `ImageCategory_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `ImageCategory_imageId_categoryId_key`(`imageId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImageCategory` ADD CONSTRAINT `ImageCategory_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `Image`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImageCategory` ADD CONSTRAINT `ImageCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
