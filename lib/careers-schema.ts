/**
 * Careers / recruitment schema. Strictly additive: every statement is
 * idempotent, existing tables and rows are never dropped or rewritten.
 * Dates are stored as TIMESTAMPTZ; the UI presents them in Africa/Nairobi.
 */
export const CAREERS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT '',
    module TEXT NOT NULL DEFAULT 'company-wide',
    employment_type TEXT NOT NULL DEFAULT 'Full-time',
    work_mode TEXT NOT NULL DEFAULT 'On-site',
    location TEXT NOT NULL DEFAULT '',
    openings INTEGER NOT NULL DEFAULT 1,
    salary_min NUMERIC(14,2),
    salary_max NUMERIC(14,2),
    salary_visible BOOLEAN NOT NULL DEFAULT FALSE,
    purpose_statement TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    qualifications_required TEXT NOT NULL DEFAULT '',
    qualifications_preferred TEXT NOT NULL DEFAULT '',
    benefits TEXT NOT NULL DEFAULT '',
    how_to_apply TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    scheduled_publish_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
  CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs (expires_at);
  CREATE INDEX IF NOT EXISTS idx_jobs_module ON jobs (module);

  CREATE TABLE IF NOT EXISTS job_screening_questions (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_job_screening_questions_job ON job_screening_questions (job_id);

  CREATE TABLE IF NOT EXISTS job_reviewers (
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    can_email BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (job_id, admin_id)
  );

  CREATE TABLE IF NOT EXISTS career_counters (
    key TEXT PRIMARY KEY,
    next_value INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
    reference_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    current_location TEXT NOT NULL DEFAULT '',
    years_experience NUMERIC(5,2) NOT NULL DEFAULT 0,
    current_employer TEXT NOT NULL DEFAULT '',
    expected_salary NUMERIC(14,2),
    notice_period TEXT NOT NULL DEFAULT '',
    portfolio_url TEXT NOT NULL DEFAULT '',
    cover_letter TEXT NOT NULL DEFAULT '',
    heard_about TEXT NOT NULL DEFAULT '',
    consent BOOLEAN NOT NULL DEFAULT FALSE,
    consent_at TIMESTAMPTZ,
    stage TEXT NOT NULL DEFAULT 'applied',
    source TEXT NOT NULL DEFAULT 'careers',
    ip_hash TEXT NOT NULL DEFAULT '',
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_applications_job ON applications (job_id);
  CREATE INDEX IF NOT EXISTS idx_applications_email ON applications (email);
  CREATE INDEX IF NOT EXISTS idx_applications_stage ON applications (stage);
  CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications (created_at DESC);

  CREATE TABLE IF NOT EXISTS application_files (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'cv',
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_application_files_application ON application_files (application_id);

  CREATE TABLE IF NOT EXISTS application_answers (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES job_screening_questions(id) ON DELETE CASCADE,
    answer TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_application_answers_application ON application_answers (application_id);

  CREATE TABLE IF NOT EXISTS application_notes (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    admin_id UUID,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_application_notes_application ON application_notes (application_id);

  CREATE TABLE IF NOT EXISTS application_ratings (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    admin_id UUID,
    rating INTEGER NOT NULL DEFAULT 0,
    scorecard JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_application_ratings_application ON application_ratings (application_id);

  CREATE TABLE IF NOT EXISTS application_status_history (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_stage TEXT NOT NULL DEFAULT '',
    to_stage TEXT NOT NULL,
    admin_id UUID,
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_application_status_history_application ON application_status_history (application_id);

  CREATE TABLE IF NOT EXISTS application_tags (
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (application_id, tag)
  );

  CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'video',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    location TEXT NOT NULL DEFAULT '',
    meeting_link TEXT NOT NULL DEFAULT '',
    interviewers TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'scheduled',
    feedback TEXT NOT NULL DEFAULT '',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews (application_id);
  CREATE INDEX IF NOT EXISTS idx_interviews_starts_at ON interviews (starts_at);

  CREATE TABLE IF NOT EXISTS talent_pool (
    application_id UUID PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
    added_by UUID,
    note TEXT NOT NULL DEFAULT '',
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY,
    stage TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_send BOOLEAN NOT NULL DEFAULT FALSE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_email_templates_stage ON email_templates (stage);

  CREATE TABLE IF NOT EXISTS email_template_versions (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS application_emails (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    outbox_id UUID,
    template_id UUID,
    stage TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    html TEXT NOT NULL DEFAULT '',
    sent_by UUID,
    status TEXT NOT NULL DEFAULT 'queued',
    scheduled_for TIMESTAMPTZ,
    visible_to_candidate BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_application_emails_application ON application_emails (application_id);

  CREATE TABLE IF NOT EXISTS application_magic_links (
    token_hash TEXT PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS careers_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hero_title TEXT NOT NULL DEFAULT 'Careers & opportunities',
    hero_body TEXT NOT NULL DEFAULT 'Join a team delivering medical equipment and pharmacy care across Kenya. Find your next role below.',
    why_join_us TEXT NOT NULL DEFAULT 'We are a Kenyan team committed to reliable healthcare supplies, professional growth and meaningful work.',
    perks JSONB NOT NULL DEFAULT '[]'::jsonb,
    collage JSONB NOT NULL DEFAULT '[]'::jsonb,
    privacy_text TEXT NOT NULL DEFAULT 'We process applicant information to manage recruitment in line with the Kenya Data Protection Act, 2019.',
    retention_months INTEGER NOT NULL DEFAULT 0,
    auto_send JSONB NOT NULL DEFAULT '{}'::jsonb,
    digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  INSERT INTO careers_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

  CREATE TABLE IF NOT EXISTS career_cron_runs (
    key TEXT PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS talent_pool_entries (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    interest TEXT NOT NULL DEFAULT '',
    consent BOOLEAN NOT NULL DEFAULT FALSE,
    consent_at TIMESTAMPTZ,
    cv_filename TEXT NOT NULL DEFAULT '',
    cv_mime TEXT NOT NULL DEFAULT '',
    cv_data BYTEA,
    ip_hash TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_talent_pool_entries_email ON talent_pool_entries (email);

  CREATE TABLE IF NOT EXISTS career_rate_limits (
    key TEXT PRIMARY KEY,
    hits INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS reply_to TEXT NOT NULL DEFAULT '';
  ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS cc TEXT NOT NULL DEFAULT '';
  ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS bcc TEXT NOT NULL DEFAULT '';
`
