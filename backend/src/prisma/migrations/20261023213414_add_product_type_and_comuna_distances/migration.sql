-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('FOOD_CATEGORY', 'DISH');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivery_comuna" INTEGER;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'FOOD_CATEGORY';

-- CreateTable
CREATE TABLE "comuna_distances" (
    "id" SERIAL NOT NULL,
    "origin_comuna" INTEGER NOT NULL,
    "destination_comuna" INTEGER NOT NULL,
    "distance_km" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "comuna_distances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comuna_distances_origin_comuna_destination_comuna_key" ON "comuna_distances"("origin_comuna", "destination_comuna");
