require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main() {
  console.log('Seeding resources...');

  // 1. UPSC NCERT History
  const historyClasses = [
    { class: '6', title: 'Our Pasts - I', chapters: [{ name: 'Our Pasts - I (Complete Book)', link: 'https://www.anujjindal.in/wp-content/uploads/2022/06/History-Class-6.pdf' }] },
    { class: '7', title: 'Our Pasts - II', chapters: [{ name: 'Our Pasts - II (Complete Book)', link: 'https://www.anujjindal.in/wp-content/uploads/2022/06/History-Class-7th.pdf' }] },
    { class: '8', title: 'Our Pasts - III', chapters: [{ name: 'Our Pasts - III (Complete Book)', link: 'https://www.anujjindal.in/wp-content/uploads/2022/06/History-Class-8th.pdf' }] },
    { class: '9', title: 'India and the Contemporary World - I', chapters: [
      { name: 'The French Revolution', link: 'https://cdn1.byjus.com/wp-content/uploads/2019/11/NCERT-Book-for-Class-9-History-Chapter-1.pdf' },
      { name: 'Socialism in Europe and the Russian Revolution', link: 'https://ncert.nic.in/textbook/pdf/iess302.pdf' }
    ]}
  ];

  for (const c of historyClasses) {
    for (const chap of c.chapters) {
      await prisma.resource.create({
        data: {
          title: c.title,
          subject: 'history',
          class_level: c.class,
          type: 'NCERT',
          goal: 'UPSC',
          chapter_name: chap.name,
          resource_link: chap.link
        }
      });
    }
  }

  // 2. UPSC NCERT Geography
  const geoClasses = [
    { class: '6', title: 'The Earth Our Habitat', chapters: [
      { name: 'The Earth in the Solar System', link: 'https://cdn1.byjus.com/wp-content/uploads/2019/11/NCERT-Book-for-Class-6-Geography-Chapter-1.pdf' },
      { name: 'Globe: Latitudes and Longitudes', link: 'https://cdn1.byjus.com/wp-content/uploads/2019/11/NCERT-Book-for-Class-6-Geography-Chapter-2.pdf' },
      { name: 'Motions of the Earth', link: 'https://cdn1.byjus.com/wp-content/uploads/2019/11/NCERT-Book-for-Class-6-Geography-Chapter-3.pdf' },
      { name: 'Maps', link: 'https://cdn1.byjus.com/wp-content/uploads/2019/11/NCERT-Book-for-Class-6-Geography-Chapter-4.pdf' },
      { name: 'Major Domains of the Earth', link: 'https://cdn1.byjus.com/wp-content/uploads/2019/11/NCERT-Book-for-Class-6-Geography-Chapter-5.pdf' },
      { name: 'Major Landforms of the Earth', link: 'https://cdn1.byjus.com/wp-content/uploads/2019/11/NCERT-Book-for-Class-6-Geography-Chapter-6.pdf' },
      { name: 'Our Country - India', link: 'https://exams-assets.embibe.com/exams/wp-content/uploads/2020/08/05051026/fess207.pdf' },
      { name: 'India: Climate, Vegetation and Wildlife', link: 'https://cdn1.byjus.com/wp-content/uploads/2019/11/NCERT-Book-for-Class-6-Geography-Chapter-8.pdf' }
    ]},
    { class: '7', title: 'Our Environment', chapters: [
      { name: 'Environment', link: 'https://ncert.nic.in/textbook/pdf/gess201.pdf' }
    ]}
  ];

  for (const c of geoClasses) {
    for (const chap of c.chapters) {
      await prisma.resource.create({
        data: {
          title: c.title,
          subject: 'geography',
          class_level: c.class,
          type: 'NCERT',
          goal: 'UPSC',
          chapter_name: chap.name,
          resource_link: chap.link
        }
      });
    }
  }

  // 3. UPSC NCERT Polity
  const polityClasses = [
    { class: '6', title: 'Social and Political Life I', chapters: [
      { name: 'Understanding Diversity', link: 'https://ncert.nic.in/textbook/pdf/fess301.pdf' },
      { name: 'Diversity and Discrimination', link: 'https://ncert.nic.in/textbook/pdf/fess302.pdf' }
    ]},
    { class: '7', title: 'Social and Political Life II', chapters: [
      { name: 'On Equality', link: 'https://ncert.nic.in/textbook/pdf/gess301.pdf' }
    ]},
    { class: '11', title: 'Indian Constitution at Work', chapters: [
      { name: 'Constitution: Why and How?', link: 'https://ncert.nic.in/textbook/pdf/keps201.pdf' },
      { name: 'Rights in the Indian Constitution', link: 'https://ncert.nic.in/textbook/pdf/keps202.pdf' }
    ]}
  ];

  for (const c of polityClasses) {
    for (const chap of c.chapters) {
      await prisma.resource.create({
        data: {
          title: c.title,
          subject: 'polity',
          class_level: c.class,
          type: 'NCERT',
          goal: 'UPSC',
          chapter_name: chap.name,
          resource_link: chap.link
        }
      });
    }
  }

  // 4. Economics & Science
  await prisma.resource.create({
    data: {
      title: 'Economics', subject: 'economics', class_level: '9', type: 'NCERT', goal: 'UPSC', chapter_name: 'The Story of Village Palampur', resource_link: 'https://ncert.nic.in/textbook/pdf/iess301.pdf'
    }
  });

  await prisma.resource.create({
    data: {
      title: 'Science', subject: 'science', class_level: '6', type: 'NCERT', goal: 'UPSC', chapter_name: 'Components of Food', resource_link: 'https://ncert.nic.in/textbook/pdf/fesc101.pdf'
    }
  });
  await prisma.resource.create({
    data: {
      title: 'Science', subject: 'science', class_level: '6', type: 'NCERT', goal: 'UPSC', chapter_name: 'Sorting Materials into Groups', resource_link: 'https://ncert.nic.in/textbook/pdf/fesc102.pdf'
    }
  });

  // 5. Standard Books
  const stdBooks = [
    { title: 'Indian Polity', subject: 'polity', class: null, type: 'Standard Book', goal: 'UPSC', chapter_name: 'ESSENTIAL (M. Laxmikanth, 10th Ed.)', link: 'http://103.203.175.90:81/fdScript/RootOfEBooks/E%20Book%20collection%20-%202026%20-%20B/UPSC/%F0%9D%99%B8%F0%9D%9A%97%F0%9D%9A%8D%F0%9D%9A%92%F0%9D%9A%8A%F0%9D%9A%97_%F0%9D%99%BF%F0%9D%9A%98%F0%9D%9A%95%F0%9D%9A%92%F0%9D%9A%9D%F0%9D%9A%A2%F0%9D%9F%96%F0%9D%90%AD%F0%9D%90%A1_%F0%9D%90%9E%F0%9D%90%9D%F0%9D%90%A2%F0%9D%90%AD%F0%9D%90%A2%F0%9D%90%A8%F0%9D%90%A7%F0%9D%9A%8B%F0%9D%9A%A2_%F0%9D%99%BC_%F0%9D%99%BB%F0%9D%9A%8A%F0%9D%9A%A1%F0%9D%9A%96%F0%9D%9A%92%F0%9D%9A%94%F0%9D%9A%8A%F0%9D%9A%97%F0%9D%9A%9D%F0%9D%9A%91.pdf' },
    { title: 'A Brief History of Modern India', subject: 'history', class: null, type: 'Standard Book', goal: 'UPSC', chapter_name: 'HISTORY (Spectrum Editorial Board, New Ed.)', link: '#' },
    { title: 'Certificate Physical and Human Geography', subject: 'geography', class: null, type: 'Standard Book', goal: 'UPSC', chapter_name: 'GEOGRAPHY (G.C. Leong, Oxford Ed.)', link: '#' }
  ];

  for (const b of stdBooks) {
    await prisma.resource.create({
      data: {
        title: b.title,
        subject: b.subject,
        class_level: b.class,
        type: 'Standard Book',
        goal: 'UPSC',
        chapter_name: b.chapter_name,
        resource_link: b.link
      }
    });
  }

  // Create some mock JEE / NEET / SSC data to prove filtering
  await prisma.resource.create({
    data: { title: 'Concepts of Physics Vol 1', subject: 'physics', class_level: '11', type: 'Standard Book', goal: 'JEE', chapter_name: 'ESSENTIAL (H.C. Verma)', resource_link: '#' }
  });
  await prisma.resource.create({
    data: { title: 'Biology Class 11', subject: 'biology', class_level: '11', type: 'NCERT', goal: 'NEET', chapter_name: 'The Living World', resource_link: '#' }
  });
  await prisma.resource.create({
    data: { title: 'Quantitative Aptitude', subject: 'maths', class_level: null, type: 'Standard Book', goal: 'SSC', chapter_name: 'ESSENTIAL (R.S. Aggarwal)', resource_link: '#' }
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
