CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "PackagingType" AS ENUM ('BIODEGRADABLE', 'COMPOSTABLE', 'REUSABLE');

CREATE TYPE "DeliveryMethod" AS ENUM ('BICYCLE', 'ELECTRIC_VEHICLE');

CREATE TYPE "RestaurantStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED');

CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "restaurants" (
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "packaging_type" "PackagingType" NOT NULL,
    "available_delivery_method" "DeliveryMethod" NOT NULL,
    "status" "RestaurantStatus" NOT NULL,
    "sustainability_indicator" TEXT NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("restaurant_id")
);

CREATE TABLE "products" (
    "product_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("product_id")
);

CREATE TABLE "orders" (
    "order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "ordered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "distance_km" DECIMAL(6,2) NOT NULL,
    "delivery_method" "DeliveryMethod" NOT NULL,
    "packaging_type" "PackagingType" NOT NULL,
    "order_status" "OrderStatus" NOT NULL,
    "co2_saved_kg" DECIMAL(6,3) NOT NULL,
    "plastic_items_avoided" INTEGER NOT NULL,
    "delivery_latitude" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

CREATE TABLE "order_items" (
    "order_item_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("order_item_id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE INDEX "products_restaurant_id_idx" ON "products"("restaurant_id");

CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

CREATE INDEX "orders_restaurant_id_idx" ON "orders"("restaurant_id");

CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

ALTER TABLE "products" ADD CONSTRAINT "products_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("restaurant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("restaurant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;
