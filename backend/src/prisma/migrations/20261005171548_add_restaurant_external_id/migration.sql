/*
  Warnings:

  - A unique constraint covering the columns `[id_restaurante]` on the table `restaurants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_restaurante` to the `restaurants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "id_restaurante" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_id_restaurante_key" ON "restaurants"("id_restaurante");
