// Complete syllabus data for all supported competitive exams
// Each exam has subjects → topics → chapters

const EXAM_SYLLABUS = {
  upsc: {
    name: 'UPSC',
    description: 'Union Public Service Commission — Civil Services Exam',
    subjects: [
      {
        name: 'History',
        topics: [
          { name: 'Ancient India', chapters: ['Indus Valley Civilization', 'Vedic Period', 'Buddhism & Jainism', 'Maurya Empire', 'Gupta Empire'] },
          { name: 'Medieval India', chapters: ['Delhi Sultanate', 'Mughal Empire', 'Bhakti & Sufi Movements', 'Vijayanagara Empire'] },
          { name: 'Modern India', chapters: ['British East India Company', 'Indian National Movement', 'Social Reform Movements', 'Post-Independence India'] },
          { name: 'World History', chapters: ['Industrial Revolution', 'World Wars', 'Cold War', 'Decolonization'] },
        ],
      },
      {
        name: 'Geography',
        topics: [
          { name: 'Physical Geography', chapters: ['Geomorphology', 'Climatology', 'Oceanography', 'Biogeography'] },
          { name: 'Indian Geography', chapters: ['Physiography', 'Drainage System', 'Climate of India', 'Natural Vegetation', 'Mineral Resources'] },
          { name: 'Human Geography', chapters: ['Population', 'Urbanization', 'Migration', 'Economic Geography'] },
        ],
      },
      {
        name: 'Polity',
        topics: [
          { name: 'Indian Constitution', chapters: ['Preamble', 'Fundamental Rights', 'Directive Principles', 'Amendments', 'Schedules'] },
          { name: 'Governance', chapters: ['Parliament', 'Supreme Court', 'Election Commission', 'Federalism', 'Local Self Government'] },
          { name: 'Public Policy', chapters: ['Government Schemes', 'Welfare Policies', 'E-Governance'] },
        ],
      },
      {
        name: 'Economy',
        topics: [
          { name: 'Microeconomics', chapters: ['Demand & Supply', 'Market Structures', 'Price Theory'] },
          { name: 'Macroeconomics', chapters: ['National Income', 'Fiscal Policy', 'Monetary Policy', 'Inflation'] },
          { name: 'Indian Economy', chapters: ['Planning', 'Agriculture', 'Industry', 'Foreign Trade', 'Banking & Finance'] },
        ],
      },
      {
        name: 'Science & Technology',
        topics: [
          { name: 'Space Technology', chapters: ['ISRO Missions', 'Satellites', 'Space Exploration'] },
          { name: 'Biotechnology', chapters: ['Genetic Engineering', 'Stem Cells', 'Biofuels'] },
          { name: 'IT & Cyber Security', chapters: ['AI & Machine Learning', 'Blockchain', 'Cyber Threats'] },
          { name: 'Defence Technology', chapters: ['Missiles', 'Nuclear Technology', 'Defence Systems'] },
        ],
      },
      {
        name: 'Environment',
        topics: [
          { name: 'Ecology', chapters: ['Ecosystems', 'Food Chain', 'Biodiversity', 'Endemic Species'] },
          { name: 'Climate Change', chapters: ['Global Warming', 'Paris Agreement', 'Carbon Footprint'] },
          { name: 'Environmental Laws', chapters: ['Wildlife Protection Act', 'Forest Rights Act', 'Environmental Impact Assessment'] },
        ],
      },
      {
        name: 'Ethics',
        topics: [
          { name: 'Ethics & Integrity', chapters: ['Moral Thinkers', 'Ethical Theories', 'Attitude & Values'] },
          { name: 'Aptitude', chapters: ['Emotional Intelligence', 'Public Service Ethics', 'Probity in Governance'] },
          { name: 'Case Studies', chapters: ['Ethical Dilemmas', 'Decision Making', 'Conflict of Interest'] },
        ],
      },
      {
        name: 'Current Affairs',
        topics: [
          { name: 'National', chapters: ['Government Policies', 'Economy Updates', 'Social Issues'] },
          { name: 'International', chapters: ['Global Politics', 'International Organizations', 'Bilateral Relations'] },
        ],
      },
    ],
  },

  jee: {
    name: 'JEE (Main & Advanced)',
    description: 'Joint Entrance Examination — Engineering Entrance',
    subjects: [
      {
        name: 'Physics',
        topics: [
          { name: 'Mechanics', chapters: ['Kinematics', 'Laws of Motion', 'Work, Energy & Power', 'Rotational Motion', 'Gravitation'] },
          { name: 'Thermodynamics', chapters: ['Thermal Properties', 'Kinetic Theory', 'Laws of Thermodynamics', 'Heat Transfer'] },
          { name: 'Waves & Oscillations', chapters: ['Simple Harmonic Motion', 'Wave Motion', 'Sound Waves', 'Superposition'] },
          { name: 'Electrodynamics', chapters: ['Electric Charges & Fields', 'Capacitance', 'Current Electricity', 'Magnetism', 'Electromagnetic Induction'] },
          { name: 'Optics', chapters: ['Ray Optics', 'Wave Optics', 'Optical Instruments'] },
          { name: 'Modern Physics', chapters: ['Dual Nature of Matter', 'Atoms & Nuclei', 'Semiconductor Electronics', 'Communication Systems'] },
        ],
      },
      {
        name: 'Chemistry',
        topics: [
          { name: 'Physical Chemistry', chapters: ['Atomic Structure', 'Chemical Bonding', 'Thermodynamics', 'Chemical Equilibrium', 'Electrochemistry', 'Chemical Kinetics'] },
          { name: 'Inorganic Chemistry', chapters: ['Periodic Table', 's-Block Elements', 'p-Block Elements', 'd-Block Elements', 'Coordination Compounds', 'Metallurgy'] },
          { name: 'Organic Chemistry', chapters: ['Basic Concepts', 'Hydrocarbons', 'Haloalkanes', 'Alcohols & Phenols', 'Aldehydes & Ketones', 'Amines', 'Biomolecules'] },
        ],
      },
      {
        name: 'Mathematics',
        topics: [
          { name: 'Algebra', chapters: ['Sets & Relations', 'Complex Numbers', 'Quadratic Equations', 'Permutations & Combinations', 'Binomial Theorem', 'Sequences & Series', 'Matrices & Determinants'] },
          { name: 'Calculus', chapters: ['Limits & Continuity', 'Differentiation', 'Applications of Derivatives', 'Integration', 'Differential Equations'] },
          { name: 'Coordinate Geometry', chapters: ['Straight Lines', 'Circles', 'Conics — Parabola', 'Conics — Ellipse', 'Conics — Hyperbola'] },
          { name: 'Trigonometry', chapters: ['Trigonometric Functions', 'Inverse Trigonometric Functions', 'Properties of Triangles'] },
          { name: 'Vectors & 3D', chapters: ['Vector Algebra', '3D Geometry'] },
          { name: 'Probability & Statistics', chapters: ['Probability', 'Statistics', 'Mathematical Reasoning'] },
        ],
      },
    ],
  },

  neet: {
    name: 'NEET',
    description: 'National Eligibility cum Entrance Test — Medical Entrance',
    subjects: [
      {
        name: 'Physics',
        topics: [
          { name: 'Mechanics', chapters: ['Physical World & Measurement', 'Kinematics', 'Laws of Motion', 'Work, Energy & Power', 'System of Particles', 'Gravitation'] },
          { name: 'Properties of Matter', chapters: ['Mechanical Properties of Solids', 'Mechanical Properties of Fluids', 'Thermal Properties of Matter'] },
          { name: 'Thermodynamics', chapters: ['First Law', 'Second Law', 'Kinetic Theory of Gases'] },
          { name: 'Electrostatics & Current', chapters: ['Electric Charges', 'Electrostatic Potential', 'Current Electricity', 'Moving Charges & Magnetism'] },
          { name: 'Optics & Waves', chapters: ['Ray Optics', 'Wave Optics', 'Electromagnetic Waves'] },
          { name: 'Modern Physics', chapters: ['Dual Nature of Radiation', 'Atoms', 'Nuclei', 'Semiconductor Devices'] },
        ],
      },
      {
        name: 'Chemistry',
        topics: [
          { name: 'Physical Chemistry', chapters: ['Some Basic Concepts', 'Atomic Structure', 'States of Matter', 'Thermodynamics', 'Equilibrium', 'Redox Reactions', 'Electrochemistry'] },
          { name: 'Inorganic Chemistry', chapters: ['Classification of Elements', 'Chemical Bonding', 'Hydrogen', 's-Block', 'p-Block', 'd & f-Block', 'Coordination Compounds'] },
          { name: 'Organic Chemistry', chapters: ['Purification & Characterisation', 'Hydrocarbons', 'Organic Compounds with O', 'Organic Compounds with N', 'Biomolecules', 'Polymers', 'Chemistry in Everyday Life'] },
        ],
      },
      {
        name: 'Biology (Botany)',
        topics: [
          { name: 'Cell Biology', chapters: ['Cell Structure', 'Cell Division', 'Biomolecules'] },
          { name: 'Plant Physiology', chapters: ['Transport in Plants', 'Mineral Nutrition', 'Photosynthesis', 'Respiration', 'Plant Growth & Development'] },
          { name: 'Plant Diversity', chapters: ['Plant Kingdom', 'Morphology of Flowering Plants', 'Anatomy of Flowering Plants'] },
          { name: 'Genetics', chapters: ['Principles of Inheritance', 'Molecular Basis of Inheritance', 'Biotechnology'] },
          { name: 'Ecology', chapters: ['Organisms & Populations', 'Ecosystem', 'Biodiversity & Conservation'] },
        ],
      },
      {
        name: 'Biology (Zoology)',
        topics: [
          { name: 'Animal Diversity', chapters: ['Animal Kingdom', 'Structural Organisation in Animals'] },
          { name: 'Human Physiology', chapters: ['Digestion & Absorption', 'Breathing & Exchange of Gases', 'Body Fluids & Circulation', 'Excretory System', 'Locomotion & Movement', 'Neural Control', 'Chemical Coordination'] },
          { name: 'Reproduction', chapters: ['Reproduction in Organisms', 'Human Reproduction', 'Reproductive Health'] },
          { name: 'Genetics & Evolution', chapters: ['Evolution', 'Human Health & Disease'] },
          { name: 'Applied Biology', chapters: ['Microbes in Human Welfare', 'Biotechnology Applications'] },
        ],
      },
    ],
  },

  ssc_cgl: {
    name: 'SSC CGL',
    description: 'Staff Selection Commission — Combined Graduate Level',
    subjects: [
      {
        name: 'Quantitative Aptitude',
        topics: [
          { name: 'Arithmetic', chapters: ['Number System', 'Percentage', 'Profit & Loss', 'Simple & Compound Interest', 'Ratio & Proportion', 'Time & Work', 'Time, Speed & Distance'] },
          { name: 'Algebra', chapters: ['Linear Equations', 'Quadratic Equations', 'Inequalities', 'Surds & Indices'] },
          { name: 'Geometry', chapters: ['Triangles', 'Circles', 'Quadrilaterals', 'Coordinate Geometry'] },
          { name: 'Mensuration', chapters: ['Area & Perimeter', 'Volume & Surface Area'] },
          { name: 'Data Interpretation', chapters: ['Bar Graphs', 'Pie Charts', 'Tables', 'Line Graphs'] },
        ],
      },
      {
        name: 'English Language',
        topics: [
          { name: 'Grammar', chapters: ['Tenses', 'Voice & Narration', 'Subject-Verb Agreement', 'Articles & Prepositions', 'Sentence Correction'] },
          { name: 'Vocabulary', chapters: ['Synonyms & Antonyms', 'Idioms & Phrases', 'One Word Substitution', 'Spelling Errors'] },
          { name: 'Comprehension', chapters: ['Reading Comprehension', 'Cloze Test', 'Para Jumbles', 'Sentence Rearrangement'] },
        ],
      },
      {
        name: 'General Awareness',
        topics: [
          { name: 'Static GK', chapters: ['Indian History', 'Geography', 'Indian Polity', 'Indian Economy', 'General Science'] },
          { name: 'Current Affairs', chapters: ['National Events', 'International Events', 'Awards & Honours', 'Sports', 'Important Dates'] },
        ],
      },
      {
        name: 'Reasoning',
        topics: [
          { name: 'Verbal Reasoning', chapters: ['Analogy', 'Classification', 'Series', 'Coding-Decoding', 'Blood Relations', 'Direction Sense'] },
          { name: 'Non-Verbal Reasoning', chapters: ['Mirror Image', 'Water Image', 'Paper Folding', 'Embedded Figures', 'Pattern Completion'] },
          { name: 'Logical Reasoning', chapters: ['Syllogism', 'Statement & Conclusion', 'Venn Diagrams', 'Puzzles & Seating'] },
        ],
      },
    ],
  },

  gate: {
    name: 'GATE',
    description: 'Graduate Aptitude Test in Engineering',
    subjects: [
      {
        name: 'Engineering Mathematics',
        topics: [
          { name: 'Linear Algebra', chapters: ['Matrices', 'Eigenvalues', 'System of Linear Equations'] },
          { name: 'Calculus', chapters: ['Limits & Continuity', 'Differentiation', 'Integration', 'Differential Equations'] },
          { name: 'Probability & Statistics', chapters: ['Random Variables', 'Probability Distributions', 'Hypothesis Testing', 'Regression'] },
          { name: 'Discrete Mathematics', chapters: ['Sets & Relations', 'Graph Theory', 'Combinatorics', 'Mathematical Logic'] },
        ],
      },
      {
        name: 'General Aptitude',
        topics: [
          { name: 'Verbal Ability', chapters: ['Grammar', 'Sentence Completion', 'Reading Comprehension', 'Verbal Analogies'] },
          { name: 'Numerical Ability', chapters: ['Numerical Estimation', 'Data Interpretation', 'Quantitative Reasoning'] },
        ],
      },
      {
        name: 'Computer Science',
        topics: [
          { name: 'Programming', chapters: ['C Programming', 'Data Structures', 'Algorithms'] },
          { name: 'Theory of Computation', chapters: ['Regular Languages', 'Context-Free Grammars', 'Turing Machines'] },
          { name: 'Operating Systems', chapters: ['Process Management', 'Memory Management', 'File Systems', 'Concurrency'] },
          { name: 'Databases', chapters: ['ER Model', 'Relational Algebra', 'SQL', 'Normalization', 'Transactions'] },
          { name: 'Computer Networks', chapters: ['OSI & TCP/IP', 'Data Link Layer', 'Network Layer', 'Transport Layer', 'Application Layer'] },
          { name: 'Computer Architecture', chapters: ['Number System', 'Processor Design', 'Memory Hierarchy', 'Pipelining', 'I/O Systems'] },
        ],
      },
    ],
  },
};

module.exports = EXAM_SYLLABUS;
