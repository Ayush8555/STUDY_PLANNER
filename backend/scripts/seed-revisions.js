require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function seedTodayRevisions() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'student@example.com' }
    });
    if (!user) {
      console.log('No user found');
      return;
    }

    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0); // Start of UTC day

    console.log(`Seeding revisions for user ${user.id} on date ${todayDate}`);

    // Create Schedule 1
    const schedule1 = await prisma.srRevisionSchedule.create({
      data: {
        user_id: user.id,
        subject: 'Physics',
        topic: 'Laws of Motion',
        chapter: 'Chapter 5',
        next_revision_date: todayDate,
        priority_level: 'high',
        interval_days: 1,
        revision_stage: 1
      }
    });

    // Create Task 1
    await prisma.srRevisionTask.create({
      data: {
        user_id: user.id,
        revision_schedule_id: schedule1.id,
        scheduled_date: todayDate,
        status: 'pending'
      }
    });

    // Create Schedule 2
    const schedule2 = await prisma.srRevisionSchedule.create({
      data: {
        user_id: user.id,
        subject: 'Mathematics',
        topic: 'Calculus',
        chapter: 'Integration',
        next_revision_date: todayDate,
        priority_level: 'medium',
        interval_days: 3,
        revision_stage: 2
      }
    });

    // Create Task 2
    await prisma.srRevisionTask.create({
      data: {
        user_id: user.id,
        revision_schedule_id: schedule2.id,
        scheduled_date: todayDate,
        status: 'pending'
      }
    });

    console.log('Successfully seeded 2 revision tasks due today!');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedTodayRevisions();
