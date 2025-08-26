/*
  Warnings:

  - A unique constraint covering the columns `[date,recipeId,mealType]` on the table `calendar_items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."calendar_items_date_recipeId_key";

-- AlterTable
ALTER TABLE "public"."calendar_items" ADD COLUMN     "mealType" TEXT NOT NULL DEFAULT 'lunch';

-- CreateIndex
CREATE UNIQUE INDEX "calendar_items_date_recipeId_mealType_key" ON "public"."calendar_items"("date", "recipeId", "mealType");
