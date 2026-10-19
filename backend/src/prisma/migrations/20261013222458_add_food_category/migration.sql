-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM (
    'HOMEMADE',
    'FAST_FOOD',
    'COFFEE_AND_DESSERTS',
    'HEALTHY',
    'VEGAN',
    'INTERNATIONAL'
);

-- AlterTable
-- Temporarily nullable to preserve existing restaurant records.
ALTER TABLE "restaurants"
ADD COLUMN "food_category" "FoodCategory";