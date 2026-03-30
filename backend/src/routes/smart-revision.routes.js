const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth.middleware');
const {
  parseStudyLog,
  generateRevisionPlan,
  generateDailyRevisions,
  updateRevisionMetrics
} = require('../services/ai.service');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route POST /api/smart-revision/study-log
 * @desc Parse natural language study log, save it, and schedule revisions
 */
router.post('/study-log', async (req, res) => {
  try {
    const { user_input } = req.body;
    const userId = req.user.userId; // from auth middleware

    if (!user_input) {
      return res.status(400).json({ error: 'user_input is required' });
    }

    // 1. Parse log via AI
    const parsedData = await parseStudyLog(user_input);
    
    if (!parsedData || !parsedData.topics || parsedData.topics.length === 0) {
      return res.status(400).json({ error: 'Could not extract valid study topics from input.' });
    }

    let studyDate = new Date();
    if (parsedData.date) {
      const parsed = new Date(parsedData.date);
      if (!isNaN(parsed.getTime())) {
        studyDate = parsed;
      }
    }
    // 2. Fetch User Profile
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { user_id: userId },
      include: { exam: true }
    });

    const weakTopicsRecords = await prisma.weakTopic.findMany({
      where: { user_id: userId },
      include: { topic: true }
    });

    const weakTopics = weakTopicsRecords.map(w => w.topic.name);
    
    const profileData = {
      exam: studentProfile?.exam?.name || 'General',
      weakTopics: weakTopics,
      strongTopics: [] // Can be populated from TopicPerformance later if needed
    };

    // 3. Generate Revision Plan
    const revisionPlanData = await generateRevisionPlan(parsedData.topics, studyDate.toISOString().split('T')[0], profileData);

    // 4. Save everything to Database inside Transaction
    await prisma.$transaction(async (tx) => {
      // Create Study Log
      const studyLog = await tx.srStudyLog.create({
        data: {
          user_id: userId,
          study_date: studyDate
        }
      });

      // Insert Studied Topics
      for (const t of parsedData.topics) {
        await tx.srStudyLogTopic.create({
          data: {
            study_log_id: studyLog.id,
            subject: t.subject,
            topic: t.topic,
            chapter: t.chapter,
            difficulty_level: t.difficulty_level || null,
            importance_weight: t.importance_weight ? parseInt(t.importance_weight) : null
          }
        });
      }

      // Insert Generated Revision Schedules
      if (revisionPlanData && revisionPlanData.revision_plan) {
        for (const plan of revisionPlanData.revision_plan) {
          
          let stage = 1;
          
          for (const revDateStr of plan.revision_dates) {
            const nextRevDate = new Date(revDateStr);
            
            // Calculate Interval
            const diffTime = Math.abs(nextRevDate - studyDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            await tx.srRevisionSchedule.create({
              data: {
                user_id: userId,
                subject: plan.subject,
                topic: plan.topic,
                chapter: plan.chapter || null, // Optional if AI includes it
                next_revision_date: nextRevDate,
                priority_level: plan.priority || 'medium',
                interval_days: diffDays,
                revision_stage: stage++
              }
            });
          }
        }
      }
    });

    res.status(201).json({
      message: 'Study log successfully parsed and revision items scheduled.',
      study_date: studyDate,
      topics_recorded: parsedData.topics.length,
      revision_plan: revisionPlanData.revision_plan
    });

  } catch (error) {
    console.error('[Smart Revision] POST /study-log error:', error);
    res.status(500).json({ error: 'Internal server error processing study log.' });
  }
});

/**
 * @route GET /api/smart-revision/daily-tasks
 * @desc Get prioritized revision tasks for the user's dashboard based on today's date
 */
router.get('/daily-tasks', async (req, res) => {
  try {
    const userId = req.user.userId;
    // We treat "today" at 00:00 UTC to filter strictly by date. 
    // Usually it's better to pass user local timezone date string, but we'll use server date for simplicity:
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    // 1. Fetch pending schedules due today or overdue
    const pendingSchedules = await prisma.srRevisionSchedule.findMany({
      where: {
        user_id: userId,
        next_revision_date: { lte: today },
        tasks: {
          none: {
            status: { in: ['completed', 'skipped'] } 
            /* To avoid fetching schedules that already had completed tasks today */
          }
        }
      }
    });

    if (pendingSchedules.length === 0) {
      return res.json({ today_revision: [] });
    }

    // 2. Generate daily priorities via AI
    // We map only the needed info to keep prompt token count low
    const pendingRevisionsClean = pendingSchedules.map(ps => ({
      id: ps.id,
      topic: ps.topic,
      subject: ps.subject,
      priority_level: ps.priority_level,
      scheduled_date: ps.next_revision_date.toISOString().split('T')[0]
    }));

    const aiPlan = await generateDailyRevisions(todayStr, pendingRevisionsClean);

    // 3. Ensure tasks exist for the prioritized list
    const finalTasks = [];
    
    console.log('[Daily Tasks] AI Plan:', JSON.stringify(aiPlan));

    for (const aiTask of aiPlan.today_revision) {
      // Find matching schedule
      const matchedSchedule = pendingSchedules.find(ps => ps.topic.toLowerCase() === aiTask.topic.toLowerCase() && ps.subject.toLowerCase() === aiTask.subject.toLowerCase());
      
      console.log(`Matching AI task '${aiTask.topic}' with schedule:`, matchedSchedule ? 'FOUND' : 'NOT FOUND');
      
      if (matchedSchedule) {
        // Upsert standard Task representation (if it was generated earlier but left pending)
        const dbTask = await prisma.srRevisionTask.findFirst({
           where: { user_id: userId, revision_schedule_id: matchedSchedule.id, scheduled_date: new Date(todayStr) }
        });

        let taskId;
        if (!dbTask) {
           const newTask = await prisma.srRevisionTask.create({
              data: {
                user_id: userId,
                revision_schedule_id: matchedSchedule.id,
                scheduled_date: new Date(todayStr),
                status: 'pending'
              }
           });
           taskId = newTask.id;
        } else {
           taskId = dbTask.id;
        }

        finalTasks.push({
          task_id: taskId,
          schedule_id: matchedSchedule.id,
          subject: aiTask.subject,
          topic: aiTask.topic,
          priority: aiTask.priority || matchedSchedule.priority_level
        });
      }
    }

    res.json({
      date: todayStr,
      today_revision: finalTasks
    });

  } catch (error) {
    console.error('[Smart Revision] GET /daily-tasks error:', error);
    res.status(500).json({ error: 'Internal server error generating daily tasks.' });
  }
});

/**
 * @route POST /api/smart-revision/tasks/:taskId/complete
 * @desc Marks revision as complete and adapts schedule using AI
 */
router.post('/tasks/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { time_taken_minutes, accuracy_percentage } = req.body;
    const userId = req.user.userId;

    // 1. Fetch task and ensure it belongs to user
    const task = await prisma.srRevisionTask.findUnique({
      where: { id: taskId },
      include: { schedule: true }
    });

    if (!task) return res.status(404).json({ error: 'Revision task not found.' });
    if (task.user_id !== userId) return res.status(403).json({ error: 'Unauthorized.' });
    if (task.status === 'completed') return res.status(400).json({ error: 'Task already completed.' });

    // Assuming completion went well if accuracy > 70 or time was reasonable
    const wasCompletedWell = accuracy_percentage == null ? true : (accuracy_percentage > 70);

    // 2. Adjust using AI
    const adaptedMetrics = await updateRevisionMetrics(
      task.schedule.topic,
      wasCompletedWell,
      time_taken_minutes || 10,
      accuracy_percentage || null
    );

    // 3. Save updates
    await prisma.$transaction(async (tx) => {
      // Mark original task as completed
      await tx.srRevisionTask.update({
        where: { id: taskId },
        data: { status: 'completed' }
      });

      // Insert History Record
      await tx.srRevisionHistory.create({
         data: {
             user_id: userId,
             subject: task.schedule.subject,
             topic: task.schedule.topic,
             chapter: task.schedule.chapter,
             revision_date: new Date(),
             completed: true,
             performance_score: accuracy_percentage ? parseFloat(accuracy_percentage) : null,
             time_spent_minutes: time_taken_minutes || null
         }
      });

      // Push back the schedule interval to the newly adjusted date 
      if (adaptedMetrics && adaptedMetrics.next_revision_date) {
         let newRevDate = new Date(adaptedMetrics.next_revision_date);
         
         if (isNaN(newRevDate.getTime())) {
             // Fallback if AI hallucinates bad date
             newRevDate = new Date();
             newRevDate.setDate(newRevDate.getDate() + 7);
         }

         // Update the schedule to its Next Iteration 
         await tx.srRevisionSchedule.update({
             where: { id: task.schedule.id },
             data: {
                 next_revision_date: newRevDate,
                 priority_level: adaptedMetrics.updated_priority || task.schedule.priority_level,
                 revision_stage: task.schedule.revision_stage + 1
             }
         });
      }
    });

    res.json({
       message: 'Revision marked as completed and next date adapted.',
       adaptedPlan: adaptedMetrics
    });

  } catch (error) {
    console.error('[Smart Revision] POST /tasks/complete error:', error);
    res.status(500).json({ error: 'Internal server error updating task.' });
  }
});

module.exports = router;
