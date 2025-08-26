-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "activityLevel" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "dailyCalories" INTEGER,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "goal" TEXT,
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "targetWeight" DOUBLE PRECISION,
ADD COLUMN     "weight" DOUBLE PRECISION;
