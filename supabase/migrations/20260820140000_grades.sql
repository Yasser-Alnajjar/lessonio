-- Credit hours per subject, used to weight the term GPA. Defaults to 1 so
-- existing rows (and any subject the user never customizes) stay valid and
-- contribute equally.
alter table public.subjects
  add column credit_hours numeric not null default 1 check (credit_hours > 0);

comment on column public.subjects.credit_hours is
  'GPA weight for this subject. Matches src/lib/types/subject.ts Subject.creditHours.';

-- Per-user letter-grade scale (percentage cutoffs -> letter -> GPA points),
-- editable in Settings. Matches src/lib/types/grade.ts GradeScaleEntry[]
-- and DEFAULT_GRADE_SCALE — the default below is that same standard A-F/4.0
-- scale, kept in sync by hand since Postgres has no import from TS.
alter table public.settings
  add column grade_scale jsonb not null default '[
    {"letter": "A", "minPercent": 90, "gradePoints": 4},
    {"letter": "B", "minPercent": 80, "gradePoints": 3},
    {"letter": "C", "minPercent": 70, "gradePoints": 2},
    {"letter": "D", "minPercent": 60, "gradePoints": 1},
    {"letter": "F", "minPercent": 0, "gradePoints": 0}
  ]'::jsonb;

comment on column public.settings.grade_scale is
  'Matches src/lib/types/grade.ts GradeScaleEntry[], parsed defensively via parseGradeScale().';
