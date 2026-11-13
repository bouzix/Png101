/*
  Warnings:

  - You are about to drop the column `level` on the `category` table. All the data in the column will be lost.
  - You are about to drop the column `path` on the `category` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `category` DROP FOREIGN KEY `Category_parentId_fkey`;

-- DropIndex
DROP INDEX `Category_path_idx` ON `category`;

-- AlterTable
ALTER TABLE `category` DROP COLUMN `level`,
    DROP COLUMN `path`;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
