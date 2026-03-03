-- ============================================================
-- Periodic Task Limits & Batch Submission
-- ============================================================

-- period_type: 'day' | 'week' | NULL (NULL = no period limit)
-- period_limit: how many completions allowed per period (NULL = 1)
-- allow_batch_submission: when true, volunteer can submit multiple completions at once

ALTER TABLE tasks
  ADD COLUMN period_type text CHECK (period_type IN ('day', 'week')),
  ADD COLUMN period_limit integer DEFAULT 1 CHECK (period_limit IS NULL OR period_limit >= 1),
  ADD COLUMN allow_batch_submission boolean NOT NULL DEFAULT false;
