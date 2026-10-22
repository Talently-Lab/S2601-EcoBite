/*
  Warnings:

  - A unique constraint covering the columns `[dataset_order_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('APP', 'DATASET');

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "dataset_order_id" TEXT,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'APP',
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_dataset_order_id_key" ON "orders"("dataset_order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
