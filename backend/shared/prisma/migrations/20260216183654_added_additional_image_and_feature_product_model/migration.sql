-- AlterTable
ALTER TABLE "products" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image_alt" TEXT,
ADD COLUMN     "image_alt_2" TEXT,
ADD COLUMN     "image_background" TEXT,
ADD COLUMN     "image_title" TEXT;
