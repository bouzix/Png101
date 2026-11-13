/*
  Warnings:

  - You are about to drop the column `userAgent` on the `download` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `download` DROP COLUMN `userAgent`,
    ADD COLUMN `countryName` VARCHAR(191) NULL,
    ALTER COLUMN `deviceType` DROP DEFAULT;
