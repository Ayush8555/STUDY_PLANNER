-- ============================================================
-- PRACTICE TESTS SCHEMA MIGRATION
-- ============================================================
-- Purpose: Reorganize all practice-test-related tables into
--          a dedicated "practice_tests" schema.
-- Compatible with: PostgreSQL 14+, Neon Serverless Postgres
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1: Create the dedicated schema
-- ────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS practice_tests;

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";


-- ────────────────────────────────────────────────────────────
-- STEP 2: Create tables inside practice_tests schema
-- ────────────────────────────────────────────────────────────

-- ┌──────────────────────────────────────────────────────────┐
-- │  practice_tests.tests                                     │
-- │  Stores each generated practice test                      │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE practice_tests.tests (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        NOT NULL,
    subject_id          UUID,
    topic_requested     TEXT,
    chapter_requested   TEXT,
    difficulty_level    TEXT        DEFAULT 'medium',
    number_of_questions INTEGER     DEFAULT 10,
    duration_minutes    INTEGER     DEFAULT 30,
    status              TEXT        DEFAULT 'created',
    ai_generated        BOOLEAN     DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),

    -- FK to public.users
    CONSTRAINT fk_tests_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    -- FK to public.subjects (nullable)
    CONSTRAINT fk_tests_subject
        FOREIGN KEY (subject_id)
        REFERENCES public.subjects(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE practice_tests.tests IS 'Stores each AI-generated or custom practice test.';


-- ┌──────────────────────────────────────────────────────────┐
-- │  practice_tests.questions                                 │
-- │  Individual questions belonging to a test                 │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE practice_tests.questions (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id                 UUID        NOT NULL,
    question_text           TEXT        NOT NULL,
    subject                 TEXT,
    chapter                 TEXT,
    difficulty              TEXT        DEFAULT 'medium',
    concept_tested          TEXT,
    estimated_time_seconds  INTEGER,
    question_order          INTEGER     DEFAULT 1,
    created_at              TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_questions_test
        FOREIGN KEY (test_id)
        REFERENCES practice_tests.tests(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE practice_tests.questions IS 'Individual questions belonging to a practice test.';


-- ┌──────────────────────────────────────────────────────────┐
-- │  practice_tests.question_options                          │
-- │  Answer options for each question (A, B, C, D)            │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE practice_tests.question_options (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id   UUID        NOT NULL,
    option_label  TEXT        NOT NULL,
    option_text   TEXT        NOT NULL,
    is_correct    BOOLEAN     DEFAULT false,

    CONSTRAINT fk_options_question
        FOREIGN KEY (question_id)
        REFERENCES practice_tests.questions(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE practice_tests.question_options IS 'Multiple choice options for each question.';


-- ┌──────────────────────────────────────────────────────────┐
-- │  practice_tests.question_explanations                     │
-- │  AI-generated explanations for each question              │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE practice_tests.question_explanations (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id   UUID        NOT NULL,
    explanation   TEXT        NOT NULL,
    ai_generated  BOOLEAN     DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_explanations_question
        FOREIGN KEY (question_id)
        REFERENCES practice_tests.questions(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE practice_tests.question_explanations IS 'AI-generated explanations for each practice test question.';


-- ┌──────────────────────────────────────────────────────────┐
-- │  practice_tests.student_attempts                          │
-- │  Records each student test attempt                        │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE practice_tests.student_attempts (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id             UUID        NOT NULL,
    user_id             UUID        NOT NULL,
    started_at          TIMESTAMPTZ DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    total_questions     INTEGER     DEFAULT 0,
    correct_answers     INTEGER     DEFAULT 0,
    accuracy_percentage FLOAT       DEFAULT 0,

    CONSTRAINT fk_attempts_test
        FOREIGN KEY (test_id)
        REFERENCES practice_tests.tests(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attempts_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE practice_tests.student_attempts IS 'Records each student attempt at a practice test.';


-- ┌──────────────────────────────────────────────────────────┐
-- │  practice_tests.student_answers                           │
-- │  Individual answers submitted by a student                │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE practice_tests.student_answers (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id          UUID        NOT NULL,
    question_id         UUID        NOT NULL,
    selected_option_id  UUID,
    selected_option     TEXT,
    is_correct          BOOLEAN,
    time_taken_seconds  INTEGER,

    CONSTRAINT fk_answers_attempt
        FOREIGN KEY (attempt_id)
        REFERENCES practice_tests.student_attempts(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_answers_question
        FOREIGN KEY (question_id)
        REFERENCES practice_tests.questions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_answers_option
        FOREIGN KEY (selected_option_id)
        REFERENCES practice_tests.question_options(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE practice_tests.student_answers IS 'Individual answers submitted during a test attempt.';


-- ┌──────────────────────────────────────────────────────────┐
-- │  practice_tests.test_results                              │
-- │  Aggregated results for each attempt                      │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE practice_tests.test_results (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id          UUID        NOT NULL,
    score               INTEGER     DEFAULT 0,
    accuracy            FLOAT       DEFAULT 0,
    total_time_seconds  INTEGER,
    created_at          TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_results_attempt
        FOREIGN KEY (attempt_id)
        REFERENCES practice_tests.student_attempts(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE practice_tests.test_results IS 'Aggregated score and result data for each test attempt.';


-- ┌──────────────────────────────────────────────────────────┐
-- │  practice_tests.test_analysis                             │
-- │  AI-powered analytics per attempt                         │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE practice_tests.test_analysis (
    id                       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id               UUID        NOT NULL UNIQUE,
    weak_topics              JSONB       DEFAULT '[]'::jsonb,
    strong_topics            JSONB       DEFAULT '[]'::jsonb,
    improvement_suggestions  JSONB       DEFAULT '[]'::jsonb,
    ai_feedback              TEXT,
    created_at               TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_analysis_attempt
        FOREIGN KEY (attempt_id)
        REFERENCES practice_tests.student_attempts(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE practice_tests.test_analysis IS 'AI-generated analysis: weak/strong topics, improvement suggestions.';


-- ┌──────────────────────────────────────────────────────────┐
-- │  practice_tests.question_embeddings                       │
-- │  Vector embeddings for semantic question similarity        │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE practice_tests.question_embeddings (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id   UUID        NOT NULL UNIQUE,
    embedding     vector(1536),
    model_used    TEXT        DEFAULT 'text-embedding-3-small',
    created_at    TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_embeddings_question
        FOREIGN KEY (question_id)
        REFERENCES practice_tests.questions(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE practice_tests.question_embeddings IS 'pgvector embeddings for semantic search and question deduplication.';


-- ────────────────────────────────────────────────────────────
-- STEP 3: Create performance indexes
-- ────────────────────────────────────────────────────────────

-- tests indexes
CREATE INDEX idx_tests_user_id       ON practice_tests.tests(user_id);
CREATE INDEX idx_tests_subject_id    ON practice_tests.tests(subject_id);
CREATE INDEX idx_tests_created_at    ON practice_tests.tests(created_at DESC);

-- questions indexes
CREATE INDEX idx_questions_test_id   ON practice_tests.questions(test_id);

-- question_options indexes
CREATE INDEX idx_options_question_id ON practice_tests.question_options(question_id);

-- question_explanations indexes
CREATE INDEX idx_explanations_question_id ON practice_tests.question_explanations(question_id);

-- student_attempts indexes
CREATE INDEX idx_attempts_test_id    ON practice_tests.student_attempts(test_id);
CREATE INDEX idx_attempts_user_id    ON practice_tests.student_attempts(user_id);
CREATE INDEX idx_attempts_started_at ON practice_tests.student_attempts(started_at DESC);

-- student_answers indexes
CREATE INDEX idx_answers_attempt_id  ON practice_tests.student_answers(attempt_id);
CREATE INDEX idx_answers_question_id ON practice_tests.student_answers(question_id);

-- test_results indexes
CREATE INDEX idx_results_attempt_id  ON practice_tests.test_results(attempt_id);

-- test_analysis indexes
CREATE INDEX idx_analysis_attempt_id ON practice_tests.test_analysis(attempt_id);

-- question_embeddings: HNSW index for fast ANN similarity search
CREATE INDEX idx_embeddings_vector
    ON practice_tests.question_embeddings
    USING hnsw (embedding vector_cosine_ops);


-- ────────────────────────────────────────────────────────────
-- STEP 4: Grant schema usage (for Neon/serverless compatibility)
-- ────────────────────────────────────────────────────────────
-- Adjust the role name to match your database user.
-- Neon typically uses the default user or a custom role.

-- GRANT USAGE  ON SCHEMA practice_tests TO your_db_user;
-- GRANT ALL    ON ALL TABLES    IN SCHEMA practice_tests TO your_db_user;
-- GRANT ALL    ON ALL SEQUENCES IN SCHEMA practice_tests TO your_db_user;


-- ════════════════════════════════════════════════════════════
-- MIGRATION STEPS: Move data from existing public tables
-- ════════════════════════════════════════════════════════════
-- Run these ONLY if you have existing data in the old tables.
-- Execute them IN ORDER after creating the new tables above.
-- ════════════════════════════════════════════════════════════

-- ── 4a. Migrate custom_tests → practice_tests.tests ────────

-- INSERT INTO practice_tests.tests (
--     id, user_id, subject_id, topic_requested,
--     difficulty_level, number_of_questions, duration_minutes,
--     status, ai_generated, created_at, updated_at
-- )
-- SELECT
--     id, user_id, subject_id, topic_requested,
--     difficulty, number_of_questions, duration_minutes,
--     status, true, created_at, updated_at
-- FROM public.custom_tests;


-- ── 4b. Migrate custom_test_questions → practice_tests.questions ──

-- INSERT INTO practice_tests.questions (
--     id, test_id, question_text, difficulty,
--     concept_tested, question_order, created_at
-- )
-- SELECT
--     id, test_id, question_text, difficulty,
--     concept_tested, question_order, created_at
-- FROM public.custom_test_questions;


-- ── 4c. Migrate custom_question_options → practice_tests.question_options ──

-- INSERT INTO practice_tests.question_options (
--     id, question_id, option_label, option_text, is_correct
-- )
-- SELECT
--     id, question_id, option_label, option_text, is_correct
-- FROM public.custom_question_options;


-- ── 4d. Migrate question_explanations inline data ──────────
-- The old schema stored explanations inline in custom_test_questions.
-- This extracts them into the dedicated explanations table.

-- INSERT INTO practice_tests.question_explanations (
--     question_id, explanation, ai_generated
-- )
-- SELECT
--     id, explanation, true
-- FROM public.custom_test_questions
-- WHERE explanation IS NOT NULL AND explanation != '';


-- ── 4e. Migrate student_test_attempts → practice_tests.student_attempts ──

-- INSERT INTO practice_tests.student_attempts (
--     id, test_id, user_id, started_at, completed_at,
--     total_questions, correct_answers, accuracy_percentage
-- )
-- SELECT
--     id, test_id, user_id, started_at, completed_at,
--     total_questions,
--     ROUND(accuracy * total_questions / 100)::int,
--     accuracy
-- FROM public.student_test_attempts;


-- ── 4f. Migrate student_answers → practice_tests.student_answers ──

-- INSERT INTO practice_tests.student_answers (
--     id, attempt_id, question_id, selected_option_id,
--     is_correct, time_taken_seconds
-- )
-- SELECT
--     id, attempt_id, question_id, selected_option_id,
--     is_correct, time_taken_seconds
-- FROM public.student_answers;


-- ── 4g. Migrate test_results from student_test_attempts ────
-- The old schema stored results inline; extract to dedicated table.

-- INSERT INTO practice_tests.test_results (
--     attempt_id, score, accuracy, total_time_seconds
-- )
-- SELECT
--     id, score, accuracy, time_taken_seconds
-- FROM public.student_test_attempts
-- WHERE completed_at IS NOT NULL;


-- ── 4h. Migrate test_analysis → practice_tests.test_analysis ──

-- INSERT INTO practice_tests.test_analysis (
--     id, attempt_id, weak_topics, strong_topics,
--     improvement_suggestions, ai_feedback, created_at
-- )
-- SELECT
--     id,
--     attempt_id,
--     to_jsonb(weak_topics),
--     to_jsonb(strong_topics),
--     CASE
--         WHEN improvement_suggestions IS NOT NULL
--         THEN jsonb_build_array(improvement_suggestions)
--         ELSE '[]'::jsonb
--     END,
--     ai_feedback,
--     created_at
-- FROM public.test_analysis;


-- ════════════════════════════════════════════════════════════
-- STEP 5: (OPTIONAL) Drop old tables after verifying migration
-- ════════════════════════════════════════════════════════════
-- ⚠️  ONLY run after confirming data integrity in new tables!
-- Run SELECT COUNT(*) on both old and new tables to verify.

-- DROP TABLE IF EXISTS public.student_answers CASCADE;
-- DROP TABLE IF EXISTS public.test_analysis CASCADE;
-- DROP TABLE IF EXISTS public.student_test_attempts CASCADE;
-- DROP TABLE IF EXISTS public.custom_question_options CASCADE;
-- DROP TABLE IF EXISTS public.custom_test_questions CASCADE;
-- DROP TABLE IF EXISTS public.custom_tests CASCADE;
