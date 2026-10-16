/*
  Warnings:

  - Made the column `food_category` on table `restaurants` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "restaurants" ALTER COLUMN "food_category" SET NOT NULL;
