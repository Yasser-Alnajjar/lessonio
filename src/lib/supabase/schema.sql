-- SupremeSQL: Schema for Study-Line Application
-- Generated based on type definitions and Phase 5 requirements
-- ---------------------------------------------------------------

-- Enable UUID extension (required for UUID primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- 1. Profiles (links Supabase Auth users to application data)
-- ----------------------------------------------------------------
CREATE TABLE profiles (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username      TEXT,
    full_name     TEXT,
    avatar_url    TEXT,
    timezone      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 2. Subjects
-- ----------------------------------------------------------------
CREATE TABLE subjects (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    color         TEXT NOT NULL DEFAULT '#6366F1',
    icon          TEXT NOT NULL DEFAULT 'book-open',
    is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 3. Tags (optional categorization for subjects/lessons)
-- ----------------------------------------------------------------
CREATE TABLE tags (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    color         TEXT DEFAULT '#6366F1',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 4. Lessons
-- ----------------------------------------------------------------
CREATE TABLE lessons (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    teacher          TEXT,
    location         TEXT,
    date             DATE,
    time             TIME,
    duration_minutes INTEGER,
    attendance_status TEXT REFERENCES attendance_statuses(status),
    study_status     TEXT REFERENCES study_statuses(status),
    review_status    TEXT REFERENCES review_statuses(status),
    homework_status  TEXT REFERENCES homework_statuses(status),
    exam_status      TEXT REFERENCES exam_statuses(status),
    is_archived      BOOLEAN NOT NULL DEFAULT FALSE,
    tag_ids          UUID[],
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 5. Attachments (files uploaded to Supabase Storage)
-- ----------------------------------------------------------------
CREATE TABLE attachments (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id        UUID REFERENCES lessons(id) ON DELETE CASCADE,
    bucket_path      TEXT NOT NULL,
    file_name        TEXT NOT NULL,
    mime_type        TEXT,
    size_bytes       BIGINT,
    uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 6. Lesson Notes (Markdown/rich text notes linked to lessons)
-- ----------------------------------------------------------------
CREATE TABLE lesson_notes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id        UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title            TEXT,
    content          TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 7. Homework
-- ----------------------------------------------------------------
CREATE TABLE homework (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id        UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT,
    due_date         DATE,
    attachment_path  TEXT,
    status           TEXT REFERENCES homework_statuses(status),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 8. Exams
-- ----------------------------------------------------------------
CREATE TABLE exams (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT,
    scheduled_at     TIMESTAMPTZ,
    location         TEXT,
    max_score        INTEGER,
    attachment_path  TEXT,
    status           TEXT REFERENCES exam_statuses(status),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 9. Gamification Entities
-- ----------------------------------------------------------------
CREATE TABLE achievements (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    description      TEXT,
    icon             TEXT,
    required_points  INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE goals (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type             TEXT NOT NULL,  -- e.g., 'study_minutes', 'lessons_completed'
    target_value     INTEGER NOT NULL,
    current_value    INTEGER NOT NULL DEFAULT 0,
    target_date      DATE,
    completed        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 10. Statistics (rolled‑up analytics)
-- ----------------------------------------------------------------
CREATE TABLE statistics (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    weekly_study_minutes INTEGER,
    monthly_lessons_completed INTEGER,
    streak_days      INTEGER,
    last_active_at   TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 11. Notifications
-- ----------------------------------------------------------------
CREATE TABLE notifications (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    message          TEXT NOT NULL,
    payload          JSONB,
    is_read          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 12. Foreign Data / Helper Types (optional but useful)
-- ----------------------------------------------------------------
-- Attendance statuses enumeration table
CREATE TABLE attendance_statuses (
    status TEXT PRIMARY KEY
);

INSERT INTO attendance_statuses (status) VALUES
    ('attended'), ('absent'), ('late'), ('cancelled');

-- Study statuses enumeration table
CREATE TABLE study_statuses (
    status TEXT PRIMARY KEY
);
INSERT INTO study_statuses (status) VALUES
    ('not_started'), ('studying'), ('completed'), ('reviewed');

-- Review statuses enumeration table
CREATE TABLE review_statuses (
    status TEXT PRIMARY KEY
);
INSERT INTO review_statuses (status) VALUES
    ('not_reviewed'), ('needs_review'), ('reviewed');

-- Homework statuses enumeration table
CREATE TABLE homework_statuses (
    status TEXT PRIMARY KEY
);
INSERT INTO homework_statuses (status) VALUES
    ('none'), ('pending'), ('in_progress'), ('completed');

-- Exam statuses enumeration table
CREATE TABLE exam_statuses (
    status TEXT PRIMARY KEY
);
INSERT INTO exam_statuses (status) VALUES
    ('none'), ('upcoming'), ('completed');

-- ----------------------------------------------------------------
-- 13. Row Level Security (RLS) policies (example template)
-- ----------------------------------------------------------------
-- Enable RLS on all tables (to be toggled via migrations)
-- Example for profiles:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own profile"
--     ON profiles FOR SELECT
--     USING (id = auth.uid());

-- (Subsequent migration scripts will add policies for each table.)

-- ----------------------------------------------------------------
-- End of schema.sql
-- ----------------------------------------------------------------