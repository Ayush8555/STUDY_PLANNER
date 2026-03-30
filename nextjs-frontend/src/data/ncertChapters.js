/**
 * NCERT Chapter Structure
 * Shared data source for NCERT test generation and Study Resources.
 * Format: { Subject: { classNumber: [chapterName, ...] } }
 */

export const NCERT_CHAPTERS = {
  History: {
    6: ['Our Pasts - I (Full Book)'],
    7: ['Our Pasts - II (Full Book)'],
    8: ['Our Pasts - III (Full Book)'],
    9: ['The French Revolution', 'Socialism in Europe and the Russian Revolution', 'Nazism and the Rise of Hitler', 'Forest Society and Colonialism', 'Pastoralists in the Modern World'],
    10: ['The Rise of Nationalism in Europe', 'Nationalism in India', 'The Making of a Global World', 'The Age of Industrialisation', 'Print Culture and the Modern World'],
    11: ['From the Beginning of Time', 'Writing and City Life', 'An Empire Across Three Continents', 'The Central Islamic Lands', 'Nomadic Empires', 'The Three Orders', 'Changing Cultural Traditions', 'Confrontation of Cultures', 'The Industrial Revolution', 'Displacing Indigenous Peoples', 'Paths to Modernisation'],
    12: ['Bricks, Beads and Bones', 'Kings, Farmers and Towns', 'Kinship, Caste and Class', 'Thinkers, Beliefs and Buildings', 'Through the Eyes of Travellers', 'Bhakti-Sufi Traditions', 'An Imperial Capital: Vijayanagara', 'Peasants, Zamindars and the State', 'Kings and Chronicles', 'Colonialism and the Countryside', 'Rebels and the Raj', 'Colonial Cities', 'Mahatma Gandhi and the Nationalist Movement', 'Understanding Partition', 'Framing the Constitution']
  },
  Geography: {
    6: ['The Earth in the Solar System', 'Globe: Latitudes and Longitudes', 'Motions of the Earth', 'Maps', 'Major Domains of the Earth', 'Major Landforms of the Earth', 'Our Country - India', 'India: Climate, Vegetation and Wildlife'],
    7: ['Environment', 'Inside Our Earth', 'Our Changing Earth', 'Air', 'Water', 'Natural Vegetation and Wildlife', 'Human Environment – Settlement, Transport and Communication', 'Human Environment Interactions – The Tropical and the Subtropical Region', 'Life in the Temperate Grasslands', 'Life in the Deserts'],
    8: ['Resources', 'Land, Soil, Water, Natural Vegetation and Wildlife Resources', 'Mineral and Power Resources', 'Agriculture', 'Industries', 'Human Resources'],
    9: ['India – Size and Location', 'Physical Features of India', 'Drainage', 'Climate', 'Natural Vegetation and Wildlife', 'Population'],
    10: ['Resources and Development', 'Forest and Wildlife Resources', 'Water Resources', 'Agriculture', 'Minerals and Energy Resources', 'Manufacturing Industries', 'Lifelines of National Economy'],
    11: ['Geography as a Discipline', 'The Origin and Evolution of the Earth', 'Interior of the Earth', 'Distribution of Oceans and Continents', 'Minerals and Rocks', 'Geomorphic Processes', 'Landforms and their Evolution', 'Composition and Structure of Atmosphere', 'Solar Radiation, Heat Balance and Temperature', 'Atmospheric Circulation and Weather Systems', 'Water in the Atmosphere', 'World Climate and Climate Change', 'Water (Oceans)', 'Movements of Ocean Water', 'Life on the Earth', 'Biodiversity and Conservation'],
    12: ['Human Geography: Nature and Scope', 'The World Population: Distribution, Density and Growth', 'Population Composition', 'Human Development', 'Primary Activities', 'Secondary Activities', 'Tertiary and Quaternary Activities', 'Transport and Communication', 'International Trade', 'Human Settlements']
  },
  Polity: {
    6: ['Understanding Diversity', 'Diversity and Discrimination', 'What is Government?', 'Key Elements of a Democratic Government', 'Panchayati Raj', 'Rural Administration', 'Urban Administration', 'Rural Livelihoods', 'Urban Livelihoods'],
    7: ['On Equality', 'Role of the Government in Health', 'How the State Government Works', 'Growing Up as Boys and Girls', 'Women Change the World', 'Understanding Media', 'Understanding Advertising', 'Markets Around Us', 'A Shirt in the Market'],
    8: ['The Indian Constitution', 'Understanding Secularism', 'Why Do We Need a Parliament?', 'Understanding Laws', 'Judiciary', 'Understanding Our Criminal Justice System', 'Understanding Marginalisation', 'Confronting Marginalisation', 'Public Facilities', 'Law and Social Justice'],
    9: ['What is Democracy? Why Democracy?', 'Constitutional Design', 'Electoral Politics', 'Working of Institutions', 'Democratic Rights'],
    10: ['Power Sharing', 'Federalism', 'Democracy and Diversity', 'Gender, Religion and Caste', 'Popular Struggles and Movements', 'Political Parties', 'Outcomes of Democracy', 'Challenges to Democracy'],
    11: ['Constitution: Why and How?', 'Rights in the Indian Constitution', 'Election and Representation', 'Executive', 'Legislature', 'Judiciary', 'Federalism', 'Local Governments', 'Constitution as a Living Document', 'The Philosophy of the Constitution'],
    12: ['The Cold War Era', 'The End of Bipolarity', 'US Hegemony in World Politics', 'Alternative Centres of Power', 'Contemporary South Asia', 'International Organisations', 'Security in the Contemporary World', 'Environment and Natural Resources', 'Globalisation']
  },
  Economics: {
    9: ['The Story of Village Palampur', 'People as Resource', 'Poverty as a Challenge', 'Food Security in India'],
    10: ['Development', 'Sectors of the Indian Economy', 'Money and Credit', 'Globalisation and the Indian Economy', 'Consumer Rights'],
    11: ['Indian Economy on the Eve of Independence', 'Indian Economy 1950-1990', 'Liberalisation, Privatisation and Globalisation', 'Poverty', 'Human Capital Formation in India', 'Rural Development', 'Employment', 'Infrastructure', 'Environment and Sustainable Development'],
    12: ['Introduction to Macroeconomics', 'National Income Accounting', 'Money and Banking', 'Determination of Income and Employment', 'Government Budget and the Economy', 'Open Economy Macroeconomics']
  },
  Science: {
    6: ['Components of Food', 'Sorting Materials into Groups', 'Separation of Substances', 'Getting to Know Plants', 'Body Movements', 'The Living Organisms and Their Surroundings', 'Motion and Measurement of Distances', 'Light, Shadows and Reflections', 'Electricity and Circuits', 'Fun with Magnets', 'Air Around Us', 'Water', 'Fibre to Fabric'],
    7: ['Nutrition in Plants', 'Nutrition in Animals', 'Fibre to Fabric', 'Heat', 'Acids, Bases and Salts', 'Physical and Chemical Changes', 'Weather, Climate and Adaptations of Animals to Climate', 'Winds, Storms and Cyclones', 'Soil', 'Respiration in Organisms', 'Transportation in Animals and Plants', 'Reproduction in Plants', 'Motion and Time', 'Electric Current and its Effects', 'Light', 'Water: A Precious Resource', 'Forests: Our Lifeline', 'Wastewater Story'],
    8: ['Crop Production and Management', 'Microorganisms: Friend and Foe', 'Synthetic Fibres and Plastics', 'Materials: Metals and Non-Metals', 'Coal and Petroleum', 'Combustion and Flame', 'Conservation of Plants and Animals', 'Cell — Structure and Functions', 'Reproduction in Animals', 'Reaching the Age of Adolescence', 'Force and Pressure', 'Friction', 'Sound', 'Chemical Effects of Electric Current', 'Some Natural Phenomena', 'Light', 'Stars and the Solar System', 'Pollution of Air and Water'],
    9: ['Matter in Our Surroundings', 'Is Matter Around Us Pure?', 'Atoms and Molecules', 'Structure of the Atom', 'The Fundamental Unit of Life', 'Tissues', 'Diversity in Living Organisms', 'Motion', 'Force and Laws of Motion', 'Gravitation', 'Work and Energy', 'Sound', 'Why Do We Fall Ill?', 'Natural Resources', 'Improvement in Food Resources'],
    10: ['Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals', 'Carbon and its Compounds', 'Periodic Classification of Elements', 'Life Processes', 'Control and Coordination', 'How do Organisms Reproduce?', 'Heredity and Evolution', 'Light – Reflection and Refraction', 'Human Eye and Colourful World', 'Electricity', 'Magnetic Effects of Electric Current', 'Sources of Energy', 'Our Environment', 'Management of Natural Resources']
  }
};

export const NCERT_SUBJECTS = Object.keys(NCERT_CHAPTERS);
export const NCERT_CLASSES = [6, 7, 8, 9, 10, 11, 12];
