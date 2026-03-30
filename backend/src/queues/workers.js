const { Worker } = require('bullmq');
const { redis } = require('../lib/redis');
const prisma = require('../lib/prisma');
const aiService = require('../services/ai.service');

// Only start workers if Redis is available
if (redis) {
  // ── AI Task Worker ──────────────────────
  const aiWorker = new Worker('ai-tasks', async (job) => {
    console.log(`🤖 Processing AI job: ${job.name} [${job.id}]`);

    switch (job.name) {
      case 'generate-questions': {
        const { chapterId, topic, subject, difficulty, count } = job.data;
        const questions = await aiService.generateQuestions({ topic, subject, difficulty, count });

        // Store in database
        for (const q of questions) {
          await prisma.question.create({
            data: {
              chapter_id: chapterId,
              question_text: q.question_text,
              difficulty: q.difficulty || difficulty,
              source: 'ai',
              options: {
                create: q.options.map((opt) => ({
                  option_text: opt.option_text,
                  is_correct: opt.is_correct,
                })),
              },
              explanations: {
                create: [{ explanation: q.explanation }],
              },
            },
          });
        }
        console.log(`✅ Generated and stored ${questions.length} questions`);
        return { questionsGenerated: questions.length };
      }

      case 'generate-explanation': {
        const { questionId, question, correctAnswer, subject } = job.data;
        const explanation = await aiService.generateExplanation({ question, correctAnswer, subject });

        await prisma.questionExplanation.create({
          data: { question_id: questionId, explanation },
        });
        console.log(`✅ Generated explanation for question ${questionId}`);
        return { explanation };
      }

      case 'generate-timetable': {
        const { userId, subjects, availability, targetExamDate, weakTopics } = job.data;
        const result = await aiService.generateTimetable({ subjects, availability, targetExamDate, weakTopics });

        // Store recommendations
        if (result.recommendations) {
          for (const rec of result.recommendations) {
            await prisma.aiRecommendation.create({
              data: { user_id: userId, recommendation_text: rec },
            });
          }
        }
        console.log(`✅ Generated timetable for user ${userId}`);
        return result;
      }

      case 'generate-recommendations': {
        const { userId, weakTopics, performanceData } = job.data;
        const recommendations = await aiService.generateRecommendations({ weakTopics, performanceData });

        for (const rec of recommendations) {
          await prisma.aiRecommendation.create({
            data: { user_id: userId, recommendation_text: rec.recommendation_text },
          });
        }
        console.log(`✅ Generated ${recommendations.length} recommendations for user ${userId}`);
        return { count: recommendations.length };
      }

      default:
        throw new Error(`Unknown AI job: ${job.name}`);
    }
  }, {
    connection: redis,
    concurrency: 2,
  });

  aiWorker.on('failed', (job, err) => {
    console.error(`❌ AI job ${job?.name} failed:`, err.message);
  });

  // ── Analytics Worker ──────────────────────
  const analyticsWorker = new Worker('analytics', async (job) => {
    console.log(`📊 Processing analytics job: ${job.name}`);

    switch (job.name) {
      case 'update-performance': {
        const { userId, subjectId, topicId } = job.data;

        // Calculate topic performance from user answers
        const answers = await prisma.userAnswer.findMany({
          where: {
            attempt: { user_id: userId },
            question: { chapter: { topic_id: topicId } },
          },
        });

        if (answers.length > 0) {
          const correct = answers.filter((a) => a.is_correct).length;
          const accuracy = (correct / answers.length) * 100;

          await prisma.topicPerformance.upsert({
            where: { user_id_topic_id: { user_id: userId, topic_id: topicId } },
            update: { accuracy, attempts: answers.length },
            create: { user_id: userId, topic_id: topicId, accuracy, attempts: answers.length },
          });

          // Detect weak topic (accuracy < 50%)
          if (accuracy < 50) {
            await prisma.weakTopic.upsert({
              where: { user_id_topic_id: { user_id: userId, topic_id: topicId } },
              update: { weakness_score: 100 - accuracy },
              create: { user_id: userId, topic_id: topicId, weakness_score: 100 - accuracy },
            });
          } else {
            // Remove from weak topics if improved
            await prisma.weakTopic.deleteMany({
              where: { user_id: userId, topic_id: topicId },
            });
          }
        }

        // Update subject performance
        if (subjectId) {
          const subjectAnswers = await prisma.userAnswer.findMany({
            where: {
              attempt: { user_id: userId },
              question: { chapter: { topic: { subject_id: subjectId } } },
            },
          });

          if (subjectAnswers.length > 0) {
            const correct = subjectAnswers.filter((a) => a.is_correct).length;
            const accuracy = (correct / subjectAnswers.length) * 100;

            await prisma.subjectPerformance.upsert({
              where: { user_id_subject_id: { user_id: userId, subject_id: subjectId } },
              update: { accuracy, questions_attempted: subjectAnswers.length },
              create: { user_id: userId, subject_id: subjectId, accuracy, questions_attempted: subjectAnswers.length },
            });
          }
        }

        console.log(`✅ Updated performance for user ${userId}`);
        return { updated: true };
      }

      case 'update-streak': {
        const { userId } = job.data;
        const today = new Date().toISOString().split('T')[0];

        const streak = await prisma.studyStreak.findUnique({
          where: { user_id: userId },
        });

        if (!streak) {
          await prisma.studyStreak.create({
            data: { user_id: userId, current_streak: 1, longest_streak: 1, last_study_date: new Date(today) },
          });
        } else {
          const lastDate = streak.last_study_date?.toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

          let newStreak = streak.current_streak;
          if (lastDate === yesterday) {
            newStreak += 1;
          } else if (lastDate !== today) {
            newStreak = 1;
          }

          await prisma.studyStreak.update({
            where: { user_id: userId },
            data: {
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, streak.longest_streak),
              last_study_date: new Date(today),
            },
          });
        }

        console.log(`✅ Updated streak for user ${userId}`);
        return { updated: true };
      }

      default:
        throw new Error(`Unknown analytics job: ${job.name}`);
    }
  }, {
    connection: redis,
    concurrency: 3,
  });

  analyticsWorker.on('failed', (job, err) => {
    console.error(`❌ Analytics job ${job?.name} failed:`, err.message);
  });

  console.log('🔄 BullMQ workers started (AI + Analytics)');
} else {
  console.warn('⚠️  Redis unavailable — BullMQ workers not started');
}
