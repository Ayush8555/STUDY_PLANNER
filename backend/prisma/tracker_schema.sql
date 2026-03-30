-- ==========================================================
-- SCHEMA: tracker
-- DESCRIPTION: Full NCERT-based preparation tracking system
-- ==========================================================

CREATE SCHEMA IF NOT EXISTS tracker;

-- ==========================================================
-- PART 1: MASTER TABLES (STATIC DATA)
-- ==========================================================

-- 1️⃣ subjects
CREATE TABLE tracker.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE, -- History, Geography, Polity, Economics, Science
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2️⃣ classes
CREATE TABLE tracker.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_number INT NOT NULL UNIQUE CHECK (class_number BETWEEN 6 AND 12),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3️⃣ chapters
CREATE TABLE tracker.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES tracker.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES tracker.classes(id) ON DELETE CASCADE,
    chapter_name TEXT NOT NULL,
    chapter_number INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (subject_id, class_id, chapter_name)
);

-- ==========================================================
-- ENUMS FOR TRACKING
-- ==========================================================
CREATE TYPE tracker.status_enum AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE tracker.priority_enum AS ENUM ('low', 'medium', 'high');
CREATE TYPE tracker.action_type_enum AS ENUM ('status_change', 'revision_done', 'ncert_done');

-- ==========================================================
-- PART 2: USER TRACKING TABLE (MAIN)
-- ==========================================================

-- 4️⃣ user_tracker
CREATE TABLE tracker.user_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Assuming public.users exists in your existing DB
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    subject_id UUID NOT NULL REFERENCES tracker.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES tracker.classes(id) ON DELETE SET NULL,
    chapter_id UUID REFERENCES tracker.chapters(id) ON DELETE CASCADE,
    custom_topic_name TEXT,
    
    status tracker.status_enum DEFAULT 'pending',
    ncert_read BOOLEAN DEFAULT false,
    
    revision1_done BOOLEAN DEFAULT false,
    revision1_date TIMESTAMP WITH TIME ZONE,
    revision2_done BOOLEAN DEFAULT false,
    revision2_date TIMESTAMP WITH TIME ZONE,
    revision3_done BOOLEAN DEFAULT false,
    revision3_date TIMESTAMP WITH TIME ZONE,
    revision4_done BOOLEAN DEFAULT false,
    revision4_date TIMESTAMP WITH TIME ZONE,
    
    last_revised_at TIMESTAMP WITH TIME ZONE,
    priority tracker.priority_enum DEFAULT 'medium',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    -- Either chapter_id is set OR custom_topic_name is set. Just one of them.
    CONSTRAINT chk_topic_source CHECK (
        (chapter_id IS NOT NULL AND custom_topic_name IS NULL) OR 
        (chapter_id IS NULL AND custom_topic_name IS NOT NULL)
    ),
    -- Prevent duplicate entries per user + chapter
    CONSTRAINT uq_user_chapter UNIQUE NULLS NOT DISTINCT (user_id, chapter_id),
    -- Prevent duplicate entries per user + custom topic
    CONSTRAINT uq_user_custom_topic UNIQUE NULLS NOT DISTINCT (user_id, subject_id, custom_topic_name)
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION tracker.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_user_tracker_updated_at
BEFORE UPDATE ON tracker.user_tracker
FOR EACH ROW
EXECUTE PROCEDURE tracker.update_updated_at_column();

-- ==========================================================
-- PART 3: CUSTOM TOPICS TABLE
-- ==========================================================

-- 5️⃣ custom_topics
CREATE TABLE tracker.custom_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES tracker.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES tracker.classes(id) ON DELETE SET NULL,
    topic_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, subject_id, topic_name)
);

-- ==========================================================
-- PART 4: TRACKER ACTIVITY LOGS
-- ==========================================================

-- 6️⃣ tracker_logs
CREATE TABLE tracker.tracker_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tracker_id UUID NOT NULL REFERENCES tracker.user_tracker(id) ON DELETE CASCADE,
    action_type tracker.action_type_enum NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- PART 6: INDEXING (IMPORTANT)
-- ==========================================================

CREATE INDEX idx_tracker_user_id ON tracker.user_tracker(user_id);
CREATE INDEX idx_tracker_chapter_id ON tracker.user_tracker(chapter_id);
CREATE INDEX idx_tracker_subject_id ON tracker.user_tracker(subject_id);
CREATE INDEX idx_tracker_class_id ON tracker.user_tracker(class_id);
CREATE INDEX idx_tracker_status ON tracker.user_tracker(status);
CREATE INDEX idx_tracker_next_rev ON tracker.user_tracker(last_revised_at);

CREATE INDEX idx_tracker_logs_user_id ON tracker.tracker_logs(user_id);
CREATE INDEX idx_tracker_logs_tracker_id ON tracker.tracker_logs(tracker_id);

CREATE INDEX idx_custom_topics_user_id ON tracker.custom_topics(user_id);


-- ==========================================================
-- PRE-FILL DATA (INSERT QUERIES FOR NCERT)
-- ==========================================================

-- INSERT SUBJECTS
INSERT INTO tracker.subjects (name) VALUES 
('History'), ('Geography'), ('Polity'), ('Economics'), ('Science')
ON CONFLICT (name) DO NOTHING;

-- INSERT CLASSES
INSERT INTO tracker.classes (class_number) VALUES 
(6), (7), (8), (9), (10), (11), (12)
ON CONFLICT (class_number) DO NOTHING;

-- INSERT ALL NCERT CHAPTERS (Dynamically looking up subject/class IDs)
DO $$
DECLARE
    hist UUID := (SELECT id FROM tracker.subjects WHERE name = 'History');
    geog UUID := (SELECT id FROM tracker.subjects WHERE name = 'Geography');
    poli UUID := (SELECT id FROM tracker.subjects WHERE name = 'Polity');
    econ UUID := (SELECT id FROM tracker.subjects WHERE name = 'Economics');
    scie UUID := (SELECT id FROM tracker.subjects WHERE name = 'Science');
    
    c6 UUID := (SELECT id FROM tracker.classes WHERE class_number = 6);
    c7 UUID := (SELECT id FROM tracker.classes WHERE class_number = 7);
    c8 UUID := (SELECT id FROM tracker.classes WHERE class_number = 8);
    c9 UUID := (SELECT id FROM tracker.classes WHERE class_number = 9);
    c10 UUID := (SELECT id FROM tracker.classes WHERE class_number = 10);
    c11 UUID := (SELECT id FROM tracker.classes WHERE class_number = 11);
    c12 UUID := (SELECT id FROM tracker.classes WHERE class_number = 12);
BEGIN
    -- History
    INSERT INTO tracker.chapters (subject_id, class_id, chapter_number, chapter_name) VALUES
    (hist, c6, 1, 'Our Pasts - I (Full Book)'),
    (hist, c7, 1, 'Our Pasts - II (Full Book)'),
    (hist, c8, 1, 'Our Pasts - III (Full Book)'),
    (hist, c9, 1, 'The French Revolution'), (hist, c9, 2, 'Socialism in Europe and the Russian Revolution'), (hist, c9, 3, 'Nazism and the Rise of Hitler'), (hist, c9, 4, 'Forest Society and Colonialism'), (hist, c9, 5, 'Pastoralists in the Modern World'),
    (hist, c10, 1, 'The Rise of Nationalism in Europe'), (hist, c10, 2, 'Nationalism in India'), (hist, c10, 3, 'The Making of a Global World'), (hist, c10, 4, 'The Age of Industrialisation'), (hist, c10, 5, 'Print Culture and the Modern World'),
    (hist, c11, 1, 'From the Beginning of Time'), (hist, c11, 2, 'Writing and City Life'), (hist, c11, 3, 'An Empire Across Three Continents'), (hist, c11, 4, 'The Central Islamic Lands'), (hist, c11, 5, 'Nomadic Empires'), (hist, c11, 6, 'The Three Orders'), (hist, c11, 7, 'Changing Cultural Traditions'), (hist, c11, 8, 'Confrontation of Cultures'), (hist, c11, 9, 'The Industrial Revolution'), (hist, c11, 10, 'Displacing Indigenous Peoples'), (hist, c11, 11, 'Paths to Modernisation'),
    (hist, c12, 1, 'Bricks, Beads and Bones'), (hist, c12, 2, 'Kings, Farmers and Towns'), (hist, c12, 3, 'Kinship, Caste and Class'), (hist, c12, 4, 'Thinkers, Beliefs and Buildings'), (hist, c12, 5, 'Through the Eyes of Travellers'), (hist, c12, 6, 'Bhakti-Sufi Traditions'), (hist, c12, 7, 'An Imperial Capital: Vijayanagara'), (hist, c12, 8, 'Peasants, Zamindars and the State'), (hist, c12, 9, 'Kings and Chronicles'), (hist, c12, 10, 'Colonialism and the Countryside'), (hist, c12, 11, 'Rebels and the Raj'), (hist, c12, 12, 'Colonial Cities'), (hist, c12, 13, 'Mahatma Gandhi and the Nationalist Movement'), (hist, c12, 14, 'Understanding Partition'), (hist, c12, 15, 'Framing the Constitution')
    ON CONFLICT (subject_id, class_id, chapter_name) DO NOTHING;

    -- Geography
    INSERT INTO tracker.chapters (subject_id, class_id, chapter_number, chapter_name) VALUES
    (geog, c6, 1, 'The Earth in the Solar System'), (geog, c6, 2, 'Globe: Latitudes and Longitudes'), (geog, c6, 3, 'Motions of the Earth'), (geog, c6, 4, 'Maps'), (geog, c6, 5, 'Major Domains of the Earth'), (geog, c6, 6, 'Major Landforms of the Earth'), (geog, c6, 7, 'Our Country - India'), (geog, c6, 8, 'India: Climate, Vegetation and Wildlife'),
    (geog, c7, 1, 'Environment'), (geog, c7, 2, 'Inside Our Earth'), (geog, c7, 3, 'Our Changing Earth'), (geog, c7, 4, 'Air'), (geog, c7, 5, 'Water'), (geog, c7, 6, 'Natural Vegetation and Wildlife'), (geog, c7, 7, 'Human Environment – Settlement, Transport and Communication'), (geog, c7, 8, 'Human Environment Interactions – The Tropical and the Subtropical Region'), (geog, c7, 9, 'Life in the Temperate Grasslands'), (geog, c7, 10, 'Life in the Deserts'),
    (geog, c8, 1, 'Resources'), (geog, c8, 2, 'Land, Soil, Water, Natural Vegetation and Wildlife Resources'), (geog, c8, 3, 'Mineral and Power Resources'), (geog, c8, 4, 'Agriculture'), (geog, c8, 5, 'Industries'), (geog, c8, 6, 'Human Resources'),
    (geog, c9, 1, 'India – Size and Location'), (geog, c9, 2, 'Physical Features of India'), (geog, c9, 3, 'Drainage'), (geog, c9, 4, 'Climate'), (geog, c9, 5, 'Natural Vegetation and Wildlife'), (geog, c9, 6, 'Population'),
    (geog, c10, 1, 'Resources and Development'), (geog, c10, 2, 'Forest and Wildlife Resources'), (geog, c10, 3, 'Water Resources'), (geog, c10, 4, 'Agriculture'), (geog, c10, 5, 'Minerals and Energy Resources'), (geog, c10, 6, 'Manufacturing Industries'), (geog, c10, 7, 'Lifelines of National Economy'),
    (geog, c11, 1, 'Geography as a Discipline'), (geog, c11, 2, 'The Origin and Evolution of the Earth'), (geog, c11, 3, 'Interior of the Earth'), (geog, c11, 4, 'Distribution of Oceans and Continents'), (geog, c11, 5, 'Minerals and Rocks'), (geog, c11, 6, 'Geomorphic Processes'), (geog, c11, 7, 'Landforms and their Evolution'), (geog, c11, 8, 'Composition and Structure of Atmosphere'), (geog, c11, 9, 'Solar Radiation, Heat Balance and Temperature'), (geog, c11, 10, 'Atmospheric Circulation and Weather Systems'), (geog, c11, 11, 'Water in the Atmosphere'), (geog, c11, 12, 'World Climate and Climate Change'), (geog, c11, 13, 'Water (Oceans)'), (geog, c11, 14, 'Movements of Ocean Water'), (geog, c11, 15, 'Life on the Earth'), (geog, c11, 16, 'Biodiversity and Conservation'),
    (geog, c12, 1, 'Human Geography: Nature and Scope'), (geog, c12, 2, 'The World Population: Distribution, Density and Growth'), (geog, c12, 3, 'Population Composition'), (geog, c12, 4, 'Human Development'), (geog, c12, 5, 'Primary Activities'), (geog, c12, 6, 'Secondary Activities'), (geog, c12, 7, 'Tertiary and Quaternary Activities'), (geog, c12, 8, 'Transport and Communication'), (geog, c12, 9, 'International Trade'), (geog, c12, 10, 'Human Settlements')
    ON CONFLICT (subject_id, class_id, chapter_name) DO NOTHING;

    -- Polity
    INSERT INTO tracker.chapters (subject_id, class_id, chapter_number, chapter_name) VALUES
    (poli, c6, 1, 'Understanding Diversity'), (poli, c6, 2, 'Diversity and Discrimination'), (poli, c6, 3, 'What is Government?'), (poli, c6, 4, 'Key Elements of a Democratic Government'), (poli, c6, 5, 'Panchayati Raj'), (poli, c6, 6, 'Rural Administration'), (poli, c6, 7, 'Urban Administration'), (poli, c6, 8, 'Rural Livelihoods'), (poli, c6, 9, 'Urban Livelihoods'),
    (poli, c7, 1, 'On Equality'), (poli, c7, 2, 'Role of the Government in Health'), (poli, c7, 3, 'How the State Government Works'), (poli, c7, 4, 'Growing Up as Boys and Girls'), (poli, c7, 5, 'Women Change the World'), (poli, c7, 6, 'Understanding Media'), (poli, c7, 7, 'Understanding Advertising'), (poli, c7, 8, 'Markets Around Us'), (poli, c7, 9, 'A Shirt in the Market'),
    (poli, c8, 1, 'The Indian Constitution'), (poli, c8, 2, 'Understanding Secularism'), (poli, c8, 3, 'Why Do We Need a Parliament?'), (poli, c8, 4, 'Understanding Laws'), (poli, c8, 5, 'Judiciary'), (poli, c8, 6, 'Understanding Our Criminal Justice System'), (poli, c8, 7, 'Understanding Marginalisation'), (poli, c8, 8, 'Confronting Marginalisation'), (poli, c8, 9, 'Public Facilities'), (poli, c8, 10, 'Law and Social Justice'),
    (poli, c9, 1, 'What is Democracy? Why Democracy?'), (poli, c9, 2, 'Constitutional Design'), (poli, c9, 3, 'Electoral Politics'), (poli, c9, 4, 'Working of Institutions'), (poli, c9, 5, 'Democratic Rights'),
    (poli, c10, 1, 'Power Sharing'), (poli, c10, 2, 'Federalism'), (poli, c10, 3, 'Democracy and Diversity'), (poli, c10, 4, 'Gender, Religion and Caste'), (poli, c10, 5, 'Popular Struggles and Movements'), (poli, c10, 6, 'Political Parties'), (poli, c10, 7, 'Outcomes of Democracy'), (poli, c10, 8, 'Challenges to Democracy'),
    (poli, c11, 1, 'Constitution: Why and How?'), (poli, c11, 2, 'Rights in the Indian Constitution'), (poli, c11, 3, 'Election and Representation'), (poli, c11, 4, 'Executive'), (poli, c11, 5, 'Legislature'), (poli, c11, 6, 'Judiciary'), (poli, c11, 7, 'Federalism'), (poli, c11, 8, 'Local Governments'), (poli, c11, 9, 'Constitution as a Living Document'), (poli, c11, 10, 'The Philosophy of the Constitution'),
    (poli, c12, 1, 'The Cold War Era'), (poli, c12, 2, 'The End of Bipolarity'), (poli, c12, 3, 'US Hegemony in World Politics'), (poli, c12, 4, 'Alternative Centres of Power'), (poli, c12, 5, 'Contemporary South Asia'), (poli, c12, 6, 'International Organisations'), (poli, c12, 7, 'Security in the Contemporary World'), (poli, c12, 8, 'Environment and Natural Resources'), (poli, c12, 9, 'Globalisation')
    ON CONFLICT (subject_id, class_id, chapter_name) DO NOTHING;

    -- Economics
    INSERT INTO tracker.chapters (subject_id, class_id, chapter_number, chapter_name) VALUES
    (econ, c9, 1, 'The Story of Village Palampur'), (econ, c9, 2, 'People as Resource'), (econ, c9, 3, 'Poverty as a Challenge'), (econ, c9, 4, 'Food Security in India'),
    (econ, c10, 1, 'Development'), (econ, c10, 2, 'Sectors of the Indian Economy'), (econ, c10, 3, 'Money and Credit'), (econ, c10, 4, 'Globalisation and the Indian Economy'), (econ, c10, 5, 'Consumer Rights'),
    (econ, c11, 1, 'Indian Economy on the Eve of Independence'), (econ, c11, 2, 'Indian Economy 1950-1990'), (econ, c11, 3, 'Liberalisation, Privatisation and Globalisation'), (econ, c11, 4, 'Poverty'), (econ, c11, 5, 'Human Capital Formation in India'), (econ, c11, 6, 'Rural Development'), (econ, c11, 7, 'Employment'), (econ, c11, 8, 'Infrastructure'), (econ, c11, 9, 'Environment and Sustainable Development'),
    (econ, c12, 1, 'Introduction to Macroeconomics'), (econ, c12, 2, 'National Income Accounting'), (econ, c12, 3, 'Money and Banking'), (econ, c12, 4, 'Determination of Income and Employment'), (econ, c12, 5, 'Government Budget and the Economy'), (econ, c12, 6, 'Open Economy Macroeconomics')
    ON CONFLICT (subject_id, class_id, chapter_name) DO NOTHING;
    
    -- Science
    INSERT INTO tracker.chapters (subject_id, class_id, chapter_number, chapter_name) VALUES
    (scie, c6, 1, 'Components of Food'), (scie, c6, 2, 'Sorting Materials into Groups'), (scie, c6, 3, 'Separation of Substances'), (scie, c6, 4, 'Getting to Know Plants'), (scie, c6, 5, 'Body Movements'), (scie, c6, 6, 'The Living Organisms and Their Surroundings'), (scie, c6, 7, 'Motion and Measurement of Distances'), (scie, c6, 8, 'Light, Shadows and Reflections'), (scie, c6, 9, 'Electricity and Circuits'), (scie, c6, 10, 'Fun with Magnets'), (scie, c6, 11, 'Air Around Us'), (scie, c6, 12, 'Water'), (scie, c6, 13, 'Fibre to Fabric'),
    (scie, c7, 1, 'Nutrition in Plants'), (scie, c7, 2, 'Nutrition in Animals'), (scie, c7, 3, 'Fibre to Fabric'), (scie, c7, 4, 'Heat'), (scie, c7, 5, 'Acids, Bases and Salts'), (scie, c7, 6, 'Physical and Chemical Changes'), (scie, c7, 7, 'Weather, Climate and Adaptations of Animals to Climate'), (scie, c7, 8, 'Winds, Storms and Cyclones'), (scie, c7, 9, 'Soil'), (scie, c7, 10, 'Respiration in Organisms'), (scie, c7, 11, 'Transportation in Animals and Plants'), (scie, c7, 12, 'Reproduction in Plants'), (scie, c7, 13, 'Motion and Time'), (scie, c7, 14, 'Electric Current and its Effects'), (scie, c7, 15, 'Light'), (scie, c7, 16, 'Water: A Precious Resource'), (scie, c7, 17, 'Forests: Our Lifeline'), (scie, c7, 18, 'Wastewater Story'),
    (scie, c8, 1, 'Crop Production and Management'), (scie, c8, 2, 'Microorganisms: Friend and Foe'), (scie, c8, 3, 'Synthetic Fibres and Plastics'), (scie, c8, 4, 'Materials: Metals and Non-Metals'), (scie, c8, 5, 'Coal and Petroleum'), (scie, c8, 6, 'Combustion and Flame'), (scie, c8, 7, 'Conservation of Plants and Animals'), (scie, c8, 8, 'Cell — Structure and Functions'), (scie, c8, 9, 'Reproduction in Animals'), (scie, c8, 10, 'Reaching the Age of Adolescence'), (scie, c8, 11, 'Force and Pressure'), (scie, c8, 12, 'Friction'), (scie, c8, 13, 'Sound'), (scie, c8, 14, 'Chemical Effects of Electric Current'), (scie, c8, 15, 'Some Natural Phenomena'), (scie, c8, 16, 'Light'), (scie, c8, 17, 'Stars and the Solar System'), (scie, c8, 18, 'Pollution of Air and Water'),
    (scie, c9, 1, 'Matter in Our Surroundings'), (scie, c9, 2, 'Is Matter Around Us Pure?'), (scie, c9, 3, 'Atoms and Molecules'), (scie, c9, 4, 'Structure of the Atom'), (scie, c9, 5, 'The Fundamental Unit of Life'), (scie, c9, 6, 'Tissues'), (scie, c9, 7, 'Diversity in Living Organisms'), (scie, c9, 8, 'Motion'), (scie, c9, 9, 'Force and Laws of Motion'), (scie, c9, 10, 'Gravitation'), (scie, c9, 11, 'Work and Energy'), (scie, c9, 12, 'Sound'), (scie, c9, 13, 'Why Do We Fall Ill?'), (scie, c9, 14, 'Natural Resources'), (scie, c9, 15, 'Improvement in Food Resources'),
    (scie, c10, 1, 'Chemical Reactions and Equations'), (scie, c10, 2, 'Acids, Bases and Salts'), (scie, c10, 3, 'Metals and Non-metals'), (scie, c10, 4, 'Carbon and its Compounds'), (scie, c10, 5, 'Periodic Classification of Elements'), (scie, c10, 6, 'Life Processes'), (scie, c10, 7, 'Control and Coordination'), (scie, c10, 8, 'How do Organisms Reproduce?'), (scie, c10, 9, 'Heredity and Evolution'), (scie, c10, 10, 'Light – Reflection and Refraction'), (scie, c10, 11, 'Human Eye and Colourful World'), (scie, c10, 12, 'Electricity'), (scie, c10, 13, 'Magnetic Effects of Electric Current'), (scie, c10, 14, 'Sources of Energy'), (scie, c10, 15, 'Our Environment'), (scie, c10, 16, 'Management of Natural Resources')
    ON CONFLICT (subject_id, class_id, chapter_name) DO NOTHING;
END $$;

-- ==========================================================
-- PART 5: AUTO POPULATION LOGIC (PostgreSQL Function)
-- ==========================================================

-- IMPORTANT: Call this function when a user selects UPSC or registers
-- Example: SELECT tracker.auto_populate_ncert_for_user('user-uuid-here');

CREATE OR REPLACE FUNCTION tracker.auto_populate_ncert_for_user(target_user_id UUID) 
RETURNS void AS $$
BEGIN
    INSERT INTO tracker.user_tracker (user_id, subject_id, class_id, chapter_id, status, ncert_read)
    SELECT 
        target_user_id,
        ch.subject_id,
        ch.class_id,
        ch.id as chapter_id,
        'pending'::tracker.status_enum as status,
        false as ncert_read
    FROM tracker.chapters ch
    -- This constraint prevents duplicate inserts if called multiple times
    ON CONFLICT (user_id, chapter_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
