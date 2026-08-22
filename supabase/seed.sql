-- Local development grants
-- Applied automatically after `supabase db reset`.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on all tables in schema public
to authenticated;

grant usage, select
on all sequences in schema public
to authenticated;

grant execute
on all functions in schema public
to authenticated;

-- Keep privileges for objects created during local development.
alter default privileges in schema public
grant select, insert, update, delete
on tables to authenticated;

alter default privileges in schema public
grant usage, select
on sequences to authenticated;

alter default privileges in schema public
grant execute
on functions to authenticated;

-- ---------------------------------------------------------------------------
-- Local dev accounts, recreated fresh on every `supabase db reset`.
-- handle_new_user() (20260807120002_profiles.sql / 20260822120000_profiles_role.sql)
-- reads full_name/role/locale out of raw_user_meta_data and provisions
-- public.profiles/public.settings automatically, so there's nothing to
-- insert there directly. locale is set to "ar" so the demo opens in Arabic.
--
--   student@lessonio.dev / password123
--   teacher@lessonio.dev / password123
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'student@lessonio.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"سارة أحمد","role":"student","locale":"ar"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'teacher@lessonio.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"طارق حسن","role":"teacher","locale":"ar"}',
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"student@lessonio.dev"}',
    'email',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"teacher@lessonio.dev"}',
    'email',
    now(), now(), now()
  )
on conflict (provider_id, provider) do nothing;

-- ---------------------------------------------------------------------------
-- Demo dataset for the client walkthrough (Arabic content throughout).
-- Everything below is computed relative to current_date/now() (not
-- hardcoded dates) so it stays "fresh" no matter when `supabase db reset`
-- runs before a demo.
--
-- student@lessonio.dev (سارة أحمد) gets the full story: subjects, a
-- recurring weekly schedule materialized into two-and-a-half months of
-- class occurrences (with a fully-attended previous calendar month so
-- perfect-attendance can unlock), lessons in various states,
-- homework/exams/flashcards hanging off specific lessons, a 9-day study
-- streak plus scattered history, goals, and a handful of notifications.
--
-- teacher@lessonio.dev (طارق حسن) gets three classes with join codes, a
-- roster enrolling the student, and assignments mixing draft/published and
-- overdue/upcoming due dates.
-- ---------------------------------------------------------------------------

do $$
declare
  v_teacher uuid := '22222222-2222-2222-2222-222222222222';
  v_student uuid := '11111111-1111-1111-1111-111111111111';

  v_subj_math    uuid;
  v_subj_phys    uuid;
  v_subj_arabic  uuid;
  v_subj_hist    uuid;
  v_subj_english uuid;

  v_tag_midterm   uuid;
  v_tag_important uuid;
  v_tag_group     uuid;
  v_tag_review    uuid;

  v_class_math    uuid;
  v_class_phys    uuid;
  v_class_arabic  uuid;
  v_class_hist    uuid;
  v_class_english uuid;

  v_prev_month_start date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_prev_month_end   date := (date_trunc('month', current_date) - interval '1 day')::date;

  v_lesson_math_quad     uuid;
  v_lesson_math_trig     uuid;
  v_lesson_phys_newton   uuid;
  v_lesson_phys_energy   uuid;
  v_lesson_arabic_balagha uuid;
  v_lesson_arabic_essay  uuid;
  v_lesson_hist_ww2      uuid;
  v_lesson_hist_coldwar  uuid;
  v_lesson_english_grammar uuid;
  v_lesson_english_conv  uuid;

  v_tc_math uuid;
  v_tc_phys uuid;
  v_tc_hist uuid;
begin

  -- -------------------------------------------------------------------------
  -- Subjects (student)
  -- -------------------------------------------------------------------------
  insert into public.subjects (user_id, name, color, icon, credit_hours)
    values (v_student, 'الرياضيات', '#2563EB', 'calculator', 4)
    returning id into v_subj_math;
  insert into public.subjects (user_id, name, color, icon, credit_hours)
    values (v_student, 'الفيزياء', '#7C3AED', 'flask-conical', 4)
    returning id into v_subj_phys;
  insert into public.subjects (user_id, name, color, icon, credit_hours)
    values (v_student, 'اللغة العربية', '#059669', 'book-open', 3)
    returning id into v_subj_arabic;
  insert into public.subjects (user_id, name, color, icon, credit_hours)
    values (v_student, 'التاريخ', '#D97706', 'landmark', 3)
    returning id into v_subj_hist;
  insert into public.subjects (user_id, name, color, icon, credit_hours)
    values (v_student, 'اللغة الإنجليزية', '#DB2777', 'languages', 3)
    returning id into v_subj_english;

  -- -------------------------------------------------------------------------
  -- Tags (student)
  -- -------------------------------------------------------------------------
  insert into public.tags (user_id, name, color) values (v_student, 'اختبار نصفي', '#EF4444') returning id into v_tag_midterm;
  insert into public.tags (user_id, name, color) values (v_student, 'مهم', '#F59E0B') returning id into v_tag_important;
  insert into public.tags (user_id, name, color) values (v_student, 'مشروع جماعي', '#3B82F6') returning id into v_tag_group;
  insert into public.tags (user_id, name, color) values (v_student, 'مراجعة لاحقًا', '#8B5CF6') returning id into v_tag_review;

  -- -------------------------------------------------------------------------
  -- Recurring classes (student). public.classes is the recurring weekly
  -- definition (subject/teacher/location/meetings); dated instances live in
  -- public.class_occurrences, materialized below.
  -- -------------------------------------------------------------------------
  insert into public.classes (user_id, subject_id, teacher, location, meetings, is_active)
    values (
      v_student, v_subj_math, 'الأستاذة منى خالد', 'القاعة 214',
      '[{"dayOfWeek":1,"startTime":"09:00","durationMinutes":50},
        {"dayOfWeek":3,"startTime":"09:00","durationMinutes":50},
        {"dayOfWeek":5,"startTime":"09:00","durationMinutes":50}]'::jsonb,
      true
    ) returning id into v_class_math;

  insert into public.classes (user_id, subject_id, teacher, location, meetings, is_active)
    values (
      v_student, v_subj_phys, 'الأستاذ عمر سالم', 'مختبر ب',
      '[{"dayOfWeek":2,"startTime":"10:30","durationMinutes":75},
        {"dayOfWeek":4,"startTime":"10:30","durationMinutes":75}]'::jsonb,
      true
    ) returning id into v_class_phys;

  insert into public.classes (user_id, subject_id, teacher, location, meetings, is_active)
    values (
      v_student, v_subj_arabic, 'الأستاذة ليلى مراد', 'القاعة 108',
      '[{"dayOfWeek":1,"startTime":"13:00","durationMinutes":50},
        {"dayOfWeek":3,"startTime":"13:00","durationMinutes":50}]'::jsonb,
      true
    ) returning id into v_class_arabic;

  insert into public.classes (user_id, subject_id, teacher, location, meetings, is_active)
    values (
      v_student, v_subj_hist, 'الأستاذ كريم فتحي', 'القاعة 220',
      '[{"dayOfWeek":2,"startTime":"14:00","durationMinutes":50},
        {"dayOfWeek":4,"startTime":"14:00","durationMinutes":50}]'::jsonb,
      true
    ) returning id into v_class_hist;

  insert into public.classes (user_id, subject_id, teacher, location, meetings, is_active)
    values (
      v_student, v_subj_english, 'الأستاذة نور عبدالله', 'القاعة 112',
      '[{"dayOfWeek":5,"startTime":"11:00","durationMinutes":50}]'::jsonb,
      true
    ) returning id into v_class_english;

  -- -------------------------------------------------------------------------
  -- Materialize class occurrences from the classes above: from the start of
  -- last month through two weeks from now. Every occurrence in the fully
  -- completed previous calendar month is marked attended (unlocks
  -- perfect-attendance); occurrences so far this month are mostly attended
  -- with a couple of scripted late/absent days; anything from today onward
  -- is left unrecorded (null), matching a real occurrence nobody has
  -- happened yet.
  -- -------------------------------------------------------------------------
  insert into public.class_occurrences (user_id, subject_id, class_id, date, start_time, duration_minutes, attendance_status, exam_status)
  select
    c.user_id,
    c.subject_id,
    c.id,
    d::date,
    (entry ->> 'startTime')::time,
    (entry ->> 'durationMinutes')::int,
    case
      when d::date >= current_date then null
      when d::date between v_prev_month_start and v_prev_month_end then 'attended'
      when mod((d::date - v_prev_month_end), 9) = 0 then 'late'
      when mod((d::date - v_prev_month_end), 13) = 0 then 'absent'
      else 'attended'
    end,
    'none'
  from public.classes c
  cross join lateral generate_series(
    v_prev_month_start::timestamp,
    (current_date + interval '14 days')::timestamp,
    interval '1 day'
  ) as d
  cross join lateral jsonb_array_elements(c.meetings) as entry
  where c.user_id = v_student
    and extract(dow from d)::int = (entry ->> 'dayOfWeek')::int;

  -- A little calendar polish: flag the nearest upcoming Math occurrence and
  -- the nearest recent Physics occurrence as exam-related.
  update public.class_occurrences
  set exam_status = 'upcoming'
  where id = (
    select id from public.class_occurrences
    where user_id = v_student and subject_id = v_subj_math and date >= current_date
    order by date asc limit 1
  );

  update public.class_occurrences
  set exam_status = 'completed'
  where id = (
    select id from public.class_occurrences
    where user_id = v_student and subject_id = v_subj_phys and date < current_date
    order by date desc limit 1
  );

  -- -------------------------------------------------------------------------
  -- Lessons (student's own self-managed study log — independent of the
  -- class occurrences above). Anchor lessons capture their id for
  -- homework/exams/flashcards/notes below; filler lessons round out the
  -- timeline.
  -- -------------------------------------------------------------------------
  insert into public.lessons (user_id, subject_id, class_occurrence_id, title, date, study_status, review_status, homework_status)
    values (
      v_student, v_subj_math,
      (select id from public.class_occurrences where user_id = v_student and subject_id = v_subj_math and date < current_date order by date desc limit 1 offset 2),
      'المعادلات التربيعية والتحليل إلى عوامل', current_date - 10, 'completed', 'reviewed', 'completed'
    ) returning id into v_lesson_math_quad;

  insert into public.lessons (user_id, subject_id, title, date, study_status, review_status, homework_status)
    values (v_student, v_subj_math, 'مقدمة في النسب المثلثية', current_date - 2, 'studying', 'not_reviewed', 'pending')
    returning id into v_lesson_math_trig;

  insert into public.lessons (user_id, subject_id, class_occurrence_id, title, date, study_status, review_status, homework_status)
    values (
      v_student, v_subj_phys,
      (select id from public.class_occurrences where user_id = v_student and subject_id = v_subj_phys and date < current_date order by date desc limit 1 offset 4),
      'قوانين نيوتن للحركة', current_date - 15, 'completed', 'reviewed', 'completed'
    ) returning id into v_lesson_phys_newton;

  insert into public.lessons (user_id, subject_id, title, date, study_status, review_status, homework_status)
    values (v_student, v_subj_phys, 'قانون حفظ الطاقة', current_date - 1, 'studying', 'needs_review', 'pending')
    returning id into v_lesson_phys_energy;

  insert into public.lessons (user_id, subject_id, title, date, study_status, review_status, homework_status)
    values (v_student, v_subj_arabic, 'الاستعارة والتشبيه في الشعر العباسي', current_date - 8, 'completed', 'reviewed', 'completed')
    returning id into v_lesson_arabic_balagha;

  insert into public.lessons (user_id, subject_id, title, date, study_status, review_status, homework_status)
    values (v_student, v_subj_arabic, 'كتابة المقال الإقناعي', current_date - 3, 'studying', 'not_reviewed', 'pending')
    returning id into v_lesson_arabic_essay;

  insert into public.lessons (user_id, subject_id, title, date, study_status, review_status, homework_status)
    values (v_student, v_subj_hist, 'أسباب الحرب العالمية الثانية', current_date - 20, 'completed', 'reviewed', 'none')
    returning id into v_lesson_hist_ww2;

  insert into public.lessons (user_id, subject_id, title, date, study_status, review_status, homework_status)
    values (v_student, v_subj_hist, 'نظرة عامة على الحرب الباردة', current_date - 4, 'studying', 'not_reviewed', 'pending')
    returning id into v_lesson_hist_coldwar;

  insert into public.lessons (user_id, subject_id, title, date, study_status, review_status, homework_status)
    values (v_student, v_subj_english, 'قواعد Present Perfect', current_date - 6, 'completed', 'reviewed', 'completed')
    returning id into v_lesson_english_grammar;

  insert into public.lessons (user_id, subject_id, title, date, study_status, review_status, homework_status)
    values (v_student, v_subj_english, 'محادثة: التخطيط للسفر', current_date - 1, 'studying', 'needs_review', 'none')
    returning id into v_lesson_english_conv;

  insert into public.lessons (user_id, subject_id, title, date, study_status, review_status, homework_status) values
    (v_student, v_subj_math, 'أنظمة المعادلات الخطية', current_date - 25, 'completed', 'reviewed', 'completed'),
    (v_student, v_subj_math, 'القسمة المطولة لكثيرات الحدود', current_date + 3, 'not_started', 'not_reviewed', 'none'),
    (v_student, v_subj_phys, 'الزخم والتصادمات', current_date - 22, 'completed', 'reviewed', 'completed'),
    (v_student, v_subj_arabic, 'تحليل الشعر: الوزن والقافية', current_date - 16, 'completed', 'reviewed', 'none'),
    (v_student, v_subj_hist, 'الثورة الفرنسية', current_date - 30, 'completed', 'reviewed', 'none'),
    (v_student, v_subj_hist, 'نشأة الإمبراطوريات: نظرة عامة', current_date + 5, 'not_started', 'not_reviewed', 'none'),
    (v_student, v_subj_english, 'الماضي البسيط مقابل الماضي التام', current_date - 14, 'completed', 'reviewed', 'none'),
    (v_student, v_subj_english, 'مفردات: الطعام والمطاعم', current_date + 7, 'not_started', 'not_reviewed', 'none');

  -- -------------------------------------------------------------------------
  -- Lesson notes
  -- -------------------------------------------------------------------------
  insert into public.lesson_notes (lesson_id, user_id, title, content_markdown) values
    (v_lesson_math_quad, v_student, 'ملخص القانون العام',
      E'القانون العام: **x = (-b ± √(b²-4ac)) / 2a**.\n\nتحقّق من إشارة المميّز قبل افتراض وجود جذرين حقيقيين.'),
    (v_lesson_phys_newton, v_student, 'F = ma، والنقطة الدقيقة في القانون الثالث',
      E'القانون الثالث لنيوتن: تؤثر القوتان المتقابلتان على جسمين *مختلفين* — هذه هي النقطة التي يخطئ فيها كثيرون.'),
    (v_lesson_arabic_balagha, v_student, 'الفرق بين التشبيه والاستعارة',
      E'التشبيه يُذكر فيه المشبَّه والمشبَّه به معًا مع الأداة، أما الاستعارة فيُحذف منها أحدهما — ركّز على هذا الفرق في الاختبار.'),
    (v_lesson_hist_ww2, v_student, 'الخط الرئيسي للمقال',
      E'تعويضات معاهدة فرساي + الكساد الكبير = يأس اقتصادي استغلّه هتلر. هذا هو الخط الرئيسي لسؤال المقال.'),
    (v_lesson_english_grammar, v_student, 'متى نستخدم Present Perfect',
      E'نستخدم Present Perfect للحديث عن حدث بدأ في الماضي وله أثر مستمر حتى الآن — لا يُستخدم مع توقيت محدد مثل yesterday.');

  -- -------------------------------------------------------------------------
  -- Lesson tags
  -- -------------------------------------------------------------------------
  insert into public.lesson_tags (lesson_id, tag_id) values
    (v_lesson_math_trig, v_tag_midterm),
    (v_lesson_phys_newton, v_tag_important),
    (v_lesson_hist_ww2, v_tag_important),
    (v_lesson_arabic_essay, v_tag_group),
    (v_lesson_phys_energy, v_tag_review),
    (v_lesson_english_conv, v_tag_review);

  -- -------------------------------------------------------------------------
  -- Homework
  -- -------------------------------------------------------------------------
  insert into public.homework (user_id, lesson_id, subject_id, title, deadline, completed) values
    (v_student, v_lesson_math_quad, v_subj_math, 'مجموعة تدريبات 12: التحليل إلى عوامل', current_date - 10, true),
    (v_student, v_lesson_math_trig, v_subj_math, 'ورقة عمل النسب المثلثية', current_date - 1, false),
    (v_student, v_lesson_phys_newton, v_subj_phys, 'تقرير مخبري: قانون نيوتن الثاني', current_date - 14, true),
    (v_student, v_lesson_phys_energy, v_subj_phys, 'مجموعة مسائل: حفظ الطاقة', current_date + 2, false),
    (v_student, v_lesson_arabic_balagha, v_subj_arabic, 'تحليل الصور البلاغية في نص شعري', current_date - 5, true),
    (v_student, v_lesson_arabic_essay, v_subj_arabic, 'مسودة المقال الإقناعي', current_date + 3, false),
    (v_student, v_lesson_hist_coldwar, v_subj_hist, 'تلخيص قراءة: أصول الحرب الباردة', current_date + 5, false),
    (v_student, v_lesson_english_grammar, v_subj_english, 'تدريب على تصريف Present Perfect', current_date - 3, true);

  -- -------------------------------------------------------------------------
  -- Exams
  -- -------------------------------------------------------------------------
  insert into public.exams (user_id, lesson_id, subject_id, title, date, score, total_score) values
    (v_student, v_lesson_math_quad, v_subj_math, 'اختبار الوحدة 3: المعادلات التربيعية', current_date - 7, 48, 50),
    (v_student, v_lesson_math_trig, v_subj_math, 'اختبار الوحدة 4: حساب المثلثات', current_date + 6, null, 100),
    (v_student, v_lesson_phys_newton, v_subj_phys, 'اختبار منتصف الفصل: الميكانيكا', current_date - 12, 78, 100),
    (v_student, v_lesson_hist_ww2, v_subj_hist, 'اختبار وحدة الحرب العالمية الثانية', current_date - 20, 85, 100);

  -- -------------------------------------------------------------------------
  -- Flashcards (SM-2 state) + review history
  -- -------------------------------------------------------------------------
  insert into public.flashcards (user_id, lesson_id, subject_id, front, back, ease_factor, interval_days, repetitions, due_date, last_reviewed_at) values
    (v_student, v_lesson_math_quad, v_subj_math, 'ما القانون العام لحل المعادلة التربيعية؟', 'x = (-b ± √(b²-4ac)) / 2a', 2.6, 6, 3, current_date, now() - interval '6 days'),
    (v_student, v_lesson_math_quad, v_subj_math, 'كيف نحسب المميّز؟', 'b² - 4ac', 2.5, 3, 2, current_date - 1, now() - interval '4 days'),
    (v_student, v_lesson_math_quad, v_subj_math, 'إذا كان المميّز سالبًا، كم عدد الجذور الحقيقية؟', 'لا توجد جذور حقيقية (يوجد جذران عقديان)', 2.3, 1, 1, current_date + 2, now() - interval '1 day'),
    (v_student, v_lesson_math_quad, v_subj_math, 'حلّل إلى عوامل: x² - 5x + 6', '(x - 2)(x - 3)', 2.5, 0, 0, current_date, null),
    (v_student, v_lesson_math_quad, v_subj_math, 'ما صيغة الرأس للمعادلة التربيعية؟', 'y = a(x - h)² + k', 2.5, 4, 2, current_date + 3, now() - interval '2 days'),
    (v_student, v_lesson_arabic_balagha, v_subj_arabic, 'ما الفرق بين التشبيه والاستعارة؟', 'التشبيه يُذكر فيه المشبَّه والمشبَّه به مع الأداة، أما الاستعارة فيُحذف أحدهما', 2.5, 5, 3, current_date + 1, now() - interval '4 days'),
    (v_student, v_lesson_arabic_balagha, v_subj_arabic, 'ما أركان التشبيه الأربعة؟', 'المشبَّه، المشبَّه به، أداة التشبيه، ووجه الشبه', 2.4, 2, 2, current_date, now() - interval '2 days'),
    (v_student, v_lesson_arabic_balagha, v_subj_arabic, 'عرّف الاستعارة المكنية', 'استعارة يُحذف فيها المشبَّه به ويُرمز له بشيء من لوازمه', 2.5, 8, 4, current_date + 5, now() - interval '3 days'),
    (v_student, v_lesson_arabic_balagha, v_subj_arabic, 'عرّف الاستعارة التصريحية', 'استعارة يُصرَّح فيها بلفظ المشبَّه به ويُحذف المشبَّه', 2.3, 1, 1, current_date - 2, now() - interval '9 days'),
    (v_student, v_lesson_arabic_balagha, v_subj_arabic, 'ما وظيفة الصورة البلاغية في الشعر؟', 'تقريب المعنى إلى الذهن وإثارة العاطفة عبر التخييل', 2.5, 0, 0, current_date, null),
    (v_student, v_lesson_english_grammar, v_subj_english, 'When do we use the Present Perfect tense?', 'للحديث عن حدث بدأ في الماضي وله أثر مستمر حتى الآن، دون تحديد وقت حدوثه', 2.5, 3, 2, current_date - 1, now() - interval '5 days'),
    (v_student, v_lesson_english_grammar, v_subj_english, 'Conjugate ''to have'' — Present Perfect (I / she)', 'I have been / she has been', 2.6, 6, 3, current_date + 4, now() - interval '2 days'),
    (v_student, v_lesson_english_grammar, v_subj_english, 'What is the difference between ''have been'' and ''have gone''?', '''have been'' تعني ذهب وعاد، أما ''have gone'' فتعني ذهب ولم يعد بعد', 2.2, 1, 1, current_date, now() - interval '3 days'),
    (v_student, v_lesson_english_grammar, v_subj_english, 'Do we use ''yesterday'' with the Present Perfect?', 'لا، لأنه ظرف زمن محدد — يُستخدم مع Past Simple فقط', 2.5, 0, 0, current_date + 1, null),
    (v_student, v_lesson_english_grammar, v_subj_english, 'Complete the form: subject + ___ + past participle', 'have / has', 2.4, 2, 2, current_date - 3, now() - interval '10 days');

  insert into public.flashcard_reviews (user_id, flashcard_id, quality, reviewed_at)
  select v_student, f.id, q.quality, q.reviewed_at
  from public.flashcards f
  join (values
    ('ما القانون العام لحل المعادلة التربيعية؟', 4, now() - interval '13 days'),
    ('ما القانون العام لحل المعادلة التربيعية؟', 5, now() - interval '6 days'),
    ('كيف نحسب المميّز؟', 3, now() - interval '11 days'),
    ('كيف نحسب المميّز؟', 4, now() - interval '4 days'),
    ('ما الفرق بين التشبيه والاستعارة؟', 5, now() - interval '10 days'),
    ('ما الفرق بين التشبيه والاستعارة؟', 5, now() - interval '4 days'),
    ('ما أركان التشبيه الأربعة؟', 3, now() - interval '9 days'),
    ('ما أركان التشبيه الأربعة؟', 4, now() - interval '2 days'),
    ('عرّف الاستعارة التصريحية', 2, now() - interval '9 days'),
    ('When do we use the Present Perfect tense?', 4, now() - interval '12 days'),
    ('When do we use the Present Perfect tense?', 4, now() - interval '5 days')
  ) as q(front, quality, reviewed_at) on q.front = f.front
  where f.user_id = v_student;

  -- -------------------------------------------------------------------------
  -- Study sessions: a 9-day running streak up to and including today (past
  -- the streak-7 threshold), scattered history further back for
  -- hundred-hours progress, and one currently-running session so the
  -- start/stop timer widget has something to show.
  -- -------------------------------------------------------------------------
  insert into public.study_sessions (user_id, subject_id, started_at, ended_at)
  select
    v_student,
    (array[v_subj_math, v_subj_phys, v_subj_arabic, v_subj_hist, v_subj_english])[1 + (n % 5)],
    started,
    started + (make_interval(mins => 30 + (n * 11) % 61))
  from generate_series(0, 8) as n,
  lateral (
    select (current_date - (8 - n))::timestamp + interval '17 hours' as started
  ) s;

  insert into public.study_sessions (user_id, subject_id, started_at, ended_at)
  select
    v_student,
    (array[v_subj_math, v_subj_phys, v_subj_arabic, v_subj_hist, v_subj_english])[1 + (n % 5)],
    started,
    started + (make_interval(mins => 35 + (n * 17) % 66))
  from generate_series(9, 75) as n,
  lateral (
    select (current_date - n)::timestamp + (make_interval(hours => 16 + n % 4, mins => (n * 7) % 60)) as started
  ) s
  where mod(n, 5) not in (0, 1);

  insert into public.study_sessions (user_id, subject_id, lesson_id, started_at, ended_at)
    values (v_student, v_subj_phys, v_lesson_phys_energy, now() - interval '25 minutes', null);

  -- -------------------------------------------------------------------------
  -- Goals: achieved_minutes derived live from the study sessions just
  -- inserted, so the numbers are always internally consistent.
  -- -------------------------------------------------------------------------
  insert into public.goals (user_id, period, target_minutes, achieved_minutes, period_start) values
    (
      v_student, 'weekly', 300,
      (select coalesce(sum(duration_minutes), 0) from public.study_sessions
       where user_id = v_student and started_at >= date_trunc('week', current_date)::timestamptz),
      date_trunc('week', current_date)::date
    ),
    (
      v_student, 'monthly', 1500,
      (select coalesce(sum(duration_minutes), 0) from public.study_sessions
       where user_id = v_student and started_at >= date_trunc('month', current_date)::timestamptz),
      date_trunc('month', current_date)::date
    );

  -- -------------------------------------------------------------------------
  -- Notifications: a realistic mix of read/unread across every type, so the
  -- bell dropdown isn't empty on first load.
  -- -------------------------------------------------------------------------
  insert into public.notifications (user_id, type, title, body, read_at, link_path, dedupe_key, created_at) values
    (v_student, 'upcoming_class', 'الفيزياء تبدأ خلال 15 دقيقة', 'حصة الفيزياء مع الأستاذ عمر سالم في مختبر ب.', null, '/calendar', 'seed:upcoming_class:1', now() - interval '15 minutes'),
    (v_student, 'homework_due', 'ورقة عمل النسب المثلثية مستحقة غدًا', E'واجب الرياضيات مستحق غدًا — لا تنسَ تسليمه.', null, '/homework/list', 'seed:hw:trig', now() - interval '2 hours'),
    (v_student, 'review_reminder', '5 بطاقات تعليمية جاهزة للمراجعة', 'بطاقات قواعد اللغة الإنجليزية جاهزة للمراجعة الآن.', null, '/flashcards', 'seed:review:english', now() - interval '5 hours'),
    (v_student, 'daily_reminder', 'حان وقت جلسة المذاكرة اليومية', E'أنت في سلسلة مذاكرة مستمرة منذ 8 أيام — واصل التقدم!', now() - interval '1 hour', '/dashboard', 'seed:daily:1', now() - interval '1 day'),
    (v_student, 'upcoming_lesson', E'لا تنسَ: درس الحرب الباردة اليوم', 'خططت لمذاكرة "نظرة عامة على الحرب الباردة" اليوم.', now() - interval '3 hours', '/lessons', 'seed:lesson:coldwar', now() - interval '26 hours'),
    (v_student, 'homework_due', 'مسودة المقال مستحقة خلال 3 أيام', 'مسودة المقال الإقناعي — خطط لعناصر المقال قريبًا.', null, '/homework/list', 'seed:hw:essay', now() - interval '3 days');

  -- -------------------------------------------------------------------------
  -- Teacher side: three classes with join codes, a roster enrolling the
  -- student, and assignments mixing draft/published and overdue/upcoming
  -- due dates. Inserted directly rather than via
  -- create_teacher_class()/join_class_by_code(), since those RPCs read
  -- auth.uid() and there is no authenticated session during a seed run —
  -- safe here because the seed script runs with superuser privileges that
  -- bypass RLS entirely.
  -- -------------------------------------------------------------------------
  insert into public.teacher_classes (teacher_id, name, subject_label, description)
    values (v_teacher, 'الرياضيات — الشعبة 3', 'الرياضيات', 'المعادلات التربيعية والدوال وأنظمة المعادلات لطلاب الصف العاشر.')
    returning id into v_tc_math;
  insert into public.teacher_classes (teacher_id, name, subject_label, description)
    values (v_teacher, 'الفيزياء المتقدمة', 'الفيزياء', 'الميكانيكا والطاقة على مستوى متقدم لطلاب المرحلة الثانوية العليا.')
    returning id into v_tc_phys;
  insert into public.teacher_classes (teacher_id, name, subject_label, description)
    values (v_teacher, 'التاريخ العالمي المتقدم', 'التاريخ', 'تاريخ القرن العشرين مع التركيز على المصادر الأولية.')
    returning id into v_tc_hist;

  insert into public.class_join_codes (teacher_class_id, code) values
    (v_tc_math, 'RIYD07'),
    (v_tc_phys, 'PHYS42'),
    (v_tc_hist, 'HIST19');

  insert into public.class_enrollments (teacher_class_id, student_id, status) values
    (v_tc_math, v_student, 'active'),
    (v_tc_phys, v_student, 'active'),
    (v_tc_hist, v_student, 'active');

  insert into public.assignments (teacher_class_id, teacher_id, title, instructions, due_at, total_points, status, published_at) values
    (v_tc_math, v_teacher, 'مجموعة تمارين الفصل 5', 'أكمل التمارين ذات الأرقام الفردية من 1 إلى 31، مع توضيح خطوات الحل كاملة.', now() + interval '4 days', 100, 'published', now() - interval '3 days'),
    (v_tc_math, v_teacher, 'ورقة مراجعة الاختبار القصير', 'تغطي التحليل إلى عوامل والقانون العام لحل المعادلة التربيعية.', now() - interval '2 days', 20, 'published', now() - interval '9 days'),
    (v_tc_math, v_teacher, 'درجة إضافية: مسائل لفظية', null, now() + interval '10 days', 15, 'draft', null),
    (v_tc_phys, v_teacher, 'تقرير مخبري: الحركة القذفية', 'اكتب تقريرًا عن نتائج تجربة يوم الجمعة وفق الصيغة القياسية للتقارير المخبرية.', now() + interval '6 days', 50, 'published', now() - interval '2 days'),
    (v_tc_phys, v_teacher, 'مجموعة مسائل: حفظ الطاقة', 'حل المسائل من 1 إلى 15 من الفصل الثامن في الكتاب المدرسي.', now() - interval '1 day', 40, 'published', now() - interval '8 days'),
    (v_tc_hist, v_teacher, 'تحليل مصدر أولي: معاهدة فرساي', 'اقرأ المقتطف وأجب عن الأسئلة الموجّهة بفقرات كاملة.', now() + interval '5 days', 30, 'published', now() - interval '4 days'),
    (v_tc_hist, v_teacher, 'مخطط أولي للوحدة 6', null, now() + interval '12 days', 25, 'draft', null);

end $$;
