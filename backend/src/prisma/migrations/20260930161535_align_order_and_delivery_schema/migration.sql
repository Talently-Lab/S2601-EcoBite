/*
  Warnings:

  - The values [BICYCLE,ELECTRIC_VEHICLE] on the enum `DeliveryMethod` will be removed. If these variants are still used in the database, this will fail.
  - The values [IN_DELIVERY,DELIVERED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [COMPOSTABLE,REUSABLE] on the enum `PackagingType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `co2_saved_kg` on the `orders` table. All the data in the column will be lost.
  - Added the required column `co2_saved_g` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryMethod_new" AS ENUM ('BIKE', 'MOTORCYCLE', 'CAR');
ALTER TABLE "restaurants" ALTER COLUMN "available_delivery_method" TYPE "DeliveryMethod_new" USING ("available_delivery_method"::text::"DeliveryMethod_new");
ALTER TABLE "orders" ALTER COLUMN "delivery_method" TYPE "DeliveryMethod_new" USING ("delivery_method"::text::"DeliveryMethod_new");
ALTER TYPE "DeliveryMethod" RENAME TO "DeliveryMethod_old";
ALTER TYPE "DeliveryMethod_new" RENAME TO "DeliveryMethod";
DROP TYPE "public"."DeliveryMethod_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'COMPLETED', 'CANCELLED');
ALTER TABLE "orders" ALTER COLUMN "order_status" TYPE "OrderStatus_new" USING ("order_status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PackagingType_new" AS ENUM ('BIODEGRADABLE');
ALTER TABLE "restaurants" ALTER COLUMN "packaging_type" TYPE "PackagingType_new" USING ("packaging_type"::text::"PackagingType_new");
ALTER TABLE "orders" ALTER COLUMN "packaging_type" TYPE "PackagingType_new" USING ("packaging_type"::text::"PackagingType_new");
ALTER TYPE "PackagingType" RENAME TO "PackagingType_old";
ALTER TYPE "PackagingType_new" RENAME TO "PackagingType";
DROP TYPE "public"."PackagingType_old";
COMMIT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "co2_saved_kg",
ADD COLUMN     "co2_saved_g" INTEGER NOT NULL,
ALTER COLUMN "delivery_latitude" DROP NOT NULL;
