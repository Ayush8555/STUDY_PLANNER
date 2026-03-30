#!/usr/bin/env node
/**
 * 🌱 Syllabus Seed Script
 * 
 * Generates the COMPLETE official syllabus for each exam using Google Gemini AI
 * and stores it permanently in the database (exams → subjects → topics → chapters → subtopics).
 * 
 * Usage:
 *   node scripts/seed-syllabus.js              # Seed all exams
 *   node scripts/seed-syllabus.js jee           # Seed only JEE
 *   node scripts/seed-syllabus.js neet upsc     # Seed NEET and UPSC
 * 
 * This script is idempotent — it skips exams that already have syllabus data.
 * To force regeneration, pass --force flag.
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('../src/lib/prisma');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ── All supported exams ──────────────────────────
const EXAMS = {
  upsc: { name: 'UPSC', description: 'Union Public Service Commission — Civil Services Examination' },
  jee:  { name: 'JEE (Main & Advanced)', description: 'Joint Entrance Examination — Engineering Entrance' },
  neet: { name: 'NEET', description: 'National Eligibility cum Entrance Test — Medical Entrance' },
  ssc_cgl: { name: 'SSC CGL', description: 'Staff Selection Commission — Combined Graduate Level' },
  gate: { name: 'GATE', description: 'Graduate Aptitude Test in Engineering — Computer Science' },
};

// ── AI Prompt ──────────────────────────
const SYSTEM_PROMPT = `You are an expert academic curriculum designer.

Your task is to generate the COMPLETE official syllabus structure for a competitive exam.

Rules:
1. Follow official exam syllabus standards used by major coaching institutes.
2. Do NOT invent topics.
3. Ensure full coverage of the exam syllabus.
4. Structure strictly as: Subject → Topic → Chapter → Subtopics
5. Chapters must represent real study units used in exam preparation.
6. Avoid duplicates.
7. Make the syllabus deep enough for test generation and study planning.

Return ONLY structured JSON.`;

function buildPrompt(examName) {
  return `${SYSTEM_PROMPT}

---

Generate the COMPLETE official syllabus for: ${examName}

Output format:
{
  "exam": "${examName}",
  "subjects": [
    {
      "subject_name": "",
      "description": "",
      "topics": [
        {
          "topic_name": "",
          "chapters": [
            {
              "chapter_name": "",
              "subtopics": ["subtopic1", "subtopic2"],
              "difficulty_level": "easy | medium | hard",
              "importance_weight": 1,
              "estimated_study_hours": 5
            }
          ]
        }
      ]
    }
  ]
}

Make sure the syllabus is COMPLETE and covers ALL subjects, topics, and chapters that a student would need for ${examName} preparation. Include every major chapter from standard textbooks and coaching materials.`;
}

// ── Generate syllabus via Gemini AI (with retries) ──────────────
async function generateSyllabusAI(examName) {
  const maxRetries = 4;
  let delay = 30000; // Start with 30s

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n🤖 Calling Gemini AI for "${examName}" (attempt ${attempt}/${maxRetries})...`);
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(examName) }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 16000,
          responseMimeType: 'application/json',
        },
      });

      const text = result.response.text().trim();
      const parsed = JSON.parse(text);

      // Validate
      if (!parsed.exam || !Array.isArray(parsed.subjects) || parsed.subjects.length === 0) {
        throw new Error('Invalid AI response: missing exam or subjects');
      }

      let totalTopics = 0, totalChapters = 0, totalSubtopics = 0;
      for (const s of parsed.subjects) {
        for (const t of s.topics) {
          totalTopics++;
          for (const c of t.chapters) {
            totalChapters++;
            totalSubtopics += (c.subtopics || []).length;
          }
        }
      }

      console.log(`   ✅ Generated: ${parsed.subjects.length} subjects, ${totalTopics} topics, ${totalChapters} chapters, ${totalSubtopics} subtopics`);
      return parsed;

    } catch (err) {
      if (err.message && err.message.includes('429') && attempt < maxRetries) {
        console.log(`   ⏳ Rate limited. Waiting ${delay / 1000}s before retry...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw err;
      }
    }
  }
}

// ── Store syllabus in database ──────────────
async function storeSyllabus(examKey, syllabusData) {
  const examInfo = EXAMS[examKey];
  
  // Find or create exam
  let exam = await prisma.exam.findFirst({ where: { name: examInfo.name } });
  if (!exam) {
    exam = await prisma.exam.create({ data: { name: examInfo.name, description: examInfo.description } });
    console.log(`   📌 Created exam: ${exam.name}`);
  }

  let sCount = 0, tCount = 0, cCount = 0, stCount = 0;

  for (const subjData of syllabusData.subjects) {
    // Create subject
    let subject = await prisma.subject.findFirst({ where: { exam_id: exam.id, name: subjData.subject_name } });
    if (!subject) {
      subject = await prisma.subject.create({ data: { exam_id: exam.id, name: subjData.subject_name } });
      sCount++;
    }

    for (const topicData of subjData.topics) {
      // Create topic
      let topic = await prisma.topic.findFirst({ where: { subject_id: subject.id, name: topicData.topic_name } });
      if (!topic) {
        topic = await prisma.topic.create({ data: { subject_id: subject.id, name: topicData.topic_name } });
        tCount++;
      }

      for (const chapterData of topicData.chapters) {
        // Create chapter with new fields
        let chapter = await prisma.chapter.findFirst({ where: { topic_id: topic.id, name: chapterData.chapter_name } });
        if (!chapter) {
          chapter = await prisma.chapter.create({
            data: {
              topic_id: topic.id,
              name: chapterData.chapter_name,
              estimated_study_minutes: (chapterData.estimated_study_hours || 2) * 60,
              difficulty_level: chapterData.difficulty_level || 'medium',
              importance_weight: chapterData.importance_weight || 5,
            },
          });
          cCount++;
        }

        // Create subtopics
        for (const subtopicName of (chapterData.subtopics || [])) {
          const existing = await prisma.subtopic.findFirst({
            where: { chapter_id: chapter.id, name: subtopicName },
          });
          if (!existing) {
            await prisma.subtopic.create({ data: { chapter_id: chapter.id, name: subtopicName } });
            stCount++;
          }
        }
      }
    }
  }

  console.log(`   💾 Stored in DB: +${sCount} subjects, +${tCount} topics, +${cCount} chapters, +${stCount} subtopics`);
  return { exam, subjects: sCount, topics: tCount, chapters: cCount, subtopics: stCount };
}

// ── Main ──────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const forceMode = args.includes('--force');
  const examKeys = args.filter(a => a !== '--force');

  // Which exams to seed
  const toSeed = examKeys.length > 0
    ? examKeys.filter(k => EXAMS[k])
    : Object.keys(EXAMS);

  if (toSeed.length === 0) {
    console.log('❌ No valid exams specified. Available:', Object.keys(EXAMS).join(', '));
    process.exit(1);
  }

  console.log('🌱 Syllabus Seed Script');
  console.log(`   Exams to seed: ${toSeed.join(', ')}`);
  console.log(`   Force mode: ${forceMode ? 'ON' : 'OFF'}\n`);

  for (const key of toSeed) {
    const examInfo = EXAMS[key];
    console.log(`\n━━━ ${examInfo.name} ━━━━━━━━━━━━━━━━━━`);

    // Check if already seeded
    if (!forceMode) {
      const existing = await prisma.exam.findFirst({ where: { name: examInfo.name } });
      if (existing) {
        const subjectCount = await prisma.subject.count({ where: { exam_id: existing.id } });
        if (subjectCount > 0) {
          console.log(`   ⏭️  Already has ${subjectCount} subjects — skipping (use --force to regenerate)`);
          continue;
        }
      }
    } else {
      // In force mode, delete existing syllabus data (but keep the exam itself for FK refs)
      const existing = await prisma.exam.findFirst({ where: { name: examInfo.name } });
      if (existing) {
        console.log(`   🗑️  Force mode: clearing existing syllabus...`);
        // Delete in order: subtopics → chapters → topics → subjects
        const subjects = await prisma.subject.findMany({ where: { exam_id: existing.id }, select: { id: true } });
        const subjectIds = subjects.map(s => s.id);
        if (subjectIds.length > 0) {
          const topics = await prisma.topic.findMany({ where: { subject_id: { in: subjectIds } }, select: { id: true } });
          const topicIds = topics.map(t => t.id);
          if (topicIds.length > 0) {
            const chapters = await prisma.chapter.findMany({ where: { topic_id: { in: topicIds } }, select: { id: true } });
            const chapterIds = chapters.map(c => c.id);
            if (chapterIds.length > 0) {
              await prisma.subtopic.deleteMany({ where: { chapter_id: { in: chapterIds } } });
              await prisma.chapter.deleteMany({ where: { id: { in: chapterIds } } });
            }
            await prisma.topic.deleteMany({ where: { id: { in: topicIds } } });
          }
          await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
        }
        console.log(`   ✅ Cleared existing syllabus data`);
      }
    }

    try {
      // Generate via AI
      const syllabusData = await generateSyllabusAI(examInfo.name);
      
      // Wait 15s between API calls to respect free tier rate limits
      await new Promise(r => setTimeout(r, 15000));

      // Store in database
      await storeSyllabus(key, syllabusData);
    } catch (err) {
      console.error(`   ❌ Failed for ${examInfo.name}:`, err.message);
    }
  }

  // Print summary
  console.log('\n\n━━━ Summary ━━━━━━━━━━━━━━━━━━');
  const totalExams = await prisma.exam.count();
  const totalSubjects = await prisma.subject.count();
  const totalTopics = await prisma.topic.count();
  const totalChapters = await prisma.chapter.count();
  const totalSubtopics = await prisma.subtopic.count();
  console.log(`   📊 Database totals:`);
  console.log(`      Exams:     ${totalExams}`);
  console.log(`      Subjects:  ${totalSubjects}`);
  console.log(`      Topics:    ${totalTopics}`);
  console.log(`      Chapters:  ${totalChapters}`);
  console.log(`      Subtopics: ${totalSubtopics}`);
  console.log('\n✅ Done!\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
