/*
  Warnings:

  - You are about to alter the column `rank` on the `MatchResult` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "MatchResult" ALTER COLUMN "rank" SET DATA TYPE DOUBLE PRECISION;
