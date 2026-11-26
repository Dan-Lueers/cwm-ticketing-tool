-- Turn user.role from TEXT into a "Role" enum, converting the existing values in place.
-- (Prisma's generated version drops and recreates the column, which would reset every role to 'agent'.)

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'agent');

-- AlterTable: the TEXT default can't be cast automatically, so drop it, convert, and set it again.
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'agent';
