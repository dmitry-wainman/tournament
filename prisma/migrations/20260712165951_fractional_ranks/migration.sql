/*
  Warnings:

  - You are about to alter the column `pointsScored` on the `MatchResult` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `rank` on the `MatchResult` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "MatchResult" ALTER COLUMN "pointsScored" SET DATA TYPE INTEGER,
ALTER COLUMN "rank" SET DATA TYPE DECIMAL(65,30);
