/*
  Warnings:

  - Added the required column `color` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `features` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `popular` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rating` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reviews` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "color" TEXT NOT NULL,
ADD COLUMN     "duration" TEXT NOT NULL,
ADD COLUMN     "features" TEXT NOT NULL,
ADD COLUMN     "popular" BOOLEAN NOT NULL,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "reviews" INTEGER NOT NULL;
