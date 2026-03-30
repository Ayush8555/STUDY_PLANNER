#!/usr/bin/env node
/**
 * Direct DB seed — stores official syllabus with subtopics.
 * No AI needed. Run once: node scripts/seed-direct.js
 */
require('dotenv').config();
const prisma = require('../src/lib/prisma');
const EXAM_SYLLABUS = require('../src/data/syllabus');

async function main() {
  console.log('🌱 Seeding syllabus directly into database...\n');
  let totalS = 0, totalT = 0, totalC = 0, totalSt = 0;

  for (const [key, examData] of Object.entries(EXAM_SYLLABUS)) {
    console.log(`━━━ ${examData.name} ━━━`);

    let exam = await prisma.exam.findFirst({ where: { name: examData.name } });
    if (!exam) {
      exam = await prisma.exam.create({ data: { name: examData.name, description: examData.description } });
    }

    // Check if already seeded
    const existing = await prisma.subject.count({ where: { exam_id: exam.id } });
    if (existing > 0) {
      console.log(`   ⏭️  Already has ${existing} subjects — skipping\n`);
      continue;
    }

    for (const sd of examData.subjects) {
      const subject = await prisma.subject.create({ data: { exam_id: exam.id, name: sd.name } });
      totalS++;

      for (const td of sd.topics) {
        const topic = await prisma.topic.create({ data: { subject_id: subject.id, name: td.name } });
        totalT++;

        for (const ch of td.chapters) {
          const chName = typeof ch === 'string' ? ch : ch.name;
          const diff = typeof ch === 'object' ? ch.difficulty : 'medium';
          const weight = typeof ch === 'object' ? ch.importance : 5;
          const mins = typeof ch === 'object' ? ch.minutes : 60;
          const subs = typeof ch === 'object' && ch.subtopics ? ch.subtopics : [];

          const chapter = await prisma.chapter.create({
            data: {
              topic_id: topic.id,
              name: chName,
              estimated_study_minutes: mins || 60,
              difficulty_level: diff || 'medium',
              importance_weight: weight || 5,
            },
          });
          totalC++;

          for (const st of subs) {
            await prisma.subtopic.create({ data: { chapter_id: chapter.id, name: st } });
            totalSt++;
          }
        }
      }
    }
    console.log(`   ✅ Done\n`);
  }

  console.log(`\n━━━ Summary ━━━`);
  console.log(`   +${totalS} subjects, +${totalT} topics, +${totalC} chapters, +${totalSt} subtopics`);

  const t = await prisma.exam.count();
  console.log(`   Total exams in DB: ${t}`);
  console.log('\n✅ Seed complete!\n');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
