/*
  Warnings:

  - A unique constraint covering the columns `[date,recipeId,mealType,userId]` on the table `calendar_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `calendar_items` table without a default value. This is not possible if the table is not empty.

*/
-- Удаляем существующие данные календаря
DELETE FROM "public"."calendar_items";

-- DropIndex
DROP INDEX "public"."calendar_items_date_recipeId_mealType_key";

-- AlterTable
ALTER TABLE "public"."calendar_items" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."recipes" ADD COLUMN     "authorId" INTEGER;

-- CreateTable
CREATE TABLE "public"."food_diary_entries" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" TEXT NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "servingSize" DOUBLE PRECISION NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "proteins" DOUBLE PRECISION NOT NULL,
    "fats" DOUBLE PRECISION NOT NULL,
    "carbohydrates" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_items_date_recipeId_mealType_userId_key" ON "public"."calendar_items"("date", "recipeId", "mealType", "userId");

-- AddForeignKey
ALTER TABLE "public"."recipes" ADD CONSTRAINT "recipes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_items" ADD CONSTRAINT "calendar_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."food_diary_entries" ADD CONSTRAINT "food_diary_entries_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."food_diary_entries" ADD CONSTRAINT "food_diary_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
