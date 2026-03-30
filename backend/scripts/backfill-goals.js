require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main() {
  console.log('Backfilling existing users goals from onboarding data...');

  const onboardings = await prisma.onboarding.findMany();
  
  for (const onb of onboardings) {
    const examName = onb.target_exam || '';
    let userGoal = 'Other';
    if (examName.toLowerCase().includes('upsc')) userGoal = 'UPSC';
    else if (examName.toLowerCase().includes('jee')) userGoal = 'JEE';
    else if (examName.toLowerCase().includes('neet')) userGoal = 'NEET';
    else if (examName.toLowerCase().includes('ssc')) userGoal = 'SSC';

    await prisma.user.update({
      where: { id: onb.user_id },
      data: { goal: userGoal }
    });
    console.log(`Updated user ${onb.user_id} with goal: ${userGoal}`);
  }

  console.log('Backfill complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
