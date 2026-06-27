-- ============================================================
-- Migration: Replace DatasetCategory enum with Category table
-- ============================================================

-- 1) Create Category table
CREATE TABLE "Category" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "parentId"  TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_idx"   ON "Category"("parentId");
CREATE INDEX "Category_sortOrder_idx"  ON "Category"("sortOrder");

ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) Seed default top-level categories (matches the old enum values)
INSERT INTO "Category" (id, name, slug, "sortOrder", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Education',  'education',  1, NOW(), NOW()),
  (gen_random_uuid(), 'Retail',     'retail',     2, NOW(), NOW()),
  (gen_random_uuid(), 'Geospatial', 'geospatial', 3, NOW(), NOW()),
  (gen_random_uuid(), 'Consumer',   'consumer',   4, NOW(), NOW()),
  (gen_random_uuid(), 'Industry',   'industry',   5, NOW(), NOW()),
  (gen_random_uuid(), 'Financial',  'financial',  6, NOW(), NOW()),
  (gen_random_uuid(), 'Other',      'other',      7, NOW(), NOW());

-- 3) Add categoryId column to Dataset (nullable for now)
ALTER TABLE "Dataset" ADD COLUMN "categoryId" TEXT;

-- 4) Backfill: for each dataset, map its old enum value to the corresponding category id
UPDATE "Dataset" d
SET "categoryId" = c.id
FROM "Category" c
WHERE c.slug = LOWER(d."category"::text);

-- 5) Add FK and index
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Dataset_categoryId_idx" ON "Dataset"("categoryId");

-- 6) Drop old enum index, column and the enum type itself
DROP INDEX IF EXISTS "Dataset_category_idx";
ALTER TABLE "Dataset" DROP COLUMN "category";
DROP TYPE "DatasetCategory";

-- 7) Add new audit actions for category lifecycle events
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CATEGORY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CATEGORY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CATEGORY_DELETED';
