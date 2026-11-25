-- Apply explicitly during migration; application requests never create schema or seed data.
CREATE TABLE IF NOT EXISTS lens_workspace_meta (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  data jsonb NOT NULL,
  collections jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS lens_projects (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  collections jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS lens_reports (
  project_id text NOT NULL REFERENCES lens_projects(id),
  id text NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (project_id, id)
);
CREATE TABLE IF NOT EXISTS lens_milestones (
  project_id text NOT NULL REFERENCES lens_projects(id),
  id text NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (project_id, id)
);
CREATE TABLE IF NOT EXISTS lens_weekly_plans (
  project_id text NOT NULL REFERENCES lens_projects(id),
  id text NOT NULL,
  data jsonb NOT NULL,
  collections jsonb NOT NULL,
  PRIMARY KEY (project_id, id)
);
CREATE TABLE IF NOT EXISTS lens_weekly_tasks (
  project_id text NOT NULL,
  week_id text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (project_id, week_id, id),
  FOREIGN KEY (project_id, week_id) REFERENCES lens_weekly_plans(project_id, id)
);
CREATE TABLE IF NOT EXISTS lens_accounts (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS lens_guest_codes (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS lens_audit_events (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS lens_history_events (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS lens_login_attempts (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS lens_retired_credentials (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS lens_presence (
  id text PRIMARY KEY,
  first_name text NOT NULL,
  seen_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS lens_presence_seen_at_idx ON lens_presence (seen_at);
