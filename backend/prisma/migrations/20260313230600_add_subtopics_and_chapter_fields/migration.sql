-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "difficulty_level" TEXT,
ADD COLUMN     "importance_weight" INTEGER;

-- CreateTable
CREATE TABLE "subtopics" (
    "id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "subtopics_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "subtopics" ADD CONSTRAINT "subtopics_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
