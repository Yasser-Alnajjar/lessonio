"""
One-off generator for Phase 2 (Folder Structure).
Not part of the shipped app — safe to delete after review, or keep as a
reference for scaffolding future features by hand.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "src", "app", "[locale]")
MODULES = os.path.join(ROOT, "modules")


def write(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content.lstrip("\n"))


# Each feature dict:
#   slug, pascal, kind ('list' | 'detail' | 'single' | 'form' | 'search'),
#   action_domain, action_method, data_type, type_import, empty_default,
#   title, phase_note, param_name (for 'detail')
DOMAINS = [
    {
        "domain": "auth",
        "pascal": "Auth",
        "features": [
            {"slug": "login", "pascal": "Login", "kind": "form",
             "title": "Log in", "phase_note": "Phase 4 (Authentication)"},
            {"slug": "register", "pascal": "Register", "kind": "form",
             "title": "Create account", "phase_note": "Phase 4 (Authentication)"},
            {"slug": "forgot-password", "pascal": "ForgotPassword", "kind": "form",
             "title": "Forgot password", "phase_note": "Phase 4 (Authentication)"},
            {"slug": "reset-password", "pascal": "ResetPassword", "kind": "form",
             "title": "Reset password", "phase_note": "Phase 4 (Authentication)"},
        ],
    },
    {
        "domain": "dashboard",
        "pascal": "Dashboard",
        "features": [
            {"slug": "overview", "pascal": "Overview", "kind": "single",
             "action_domain": "Dashboard", "action_method": "getOverview",
             "data_type": "DashboardOverviewData", "type_file": "dashboard",
             "title": "Dashboard", "phase_note": "Phase 7 (Dashboard Layout)"},
        ],
    },
    {
        "domain": "subjects",
        "pascal": "Subjects",
        "features": [
            {"slug": "list", "pascal": "List", "kind": "list",
             "action_domain": "Subjects", "action_method": "getAll",
             "data_type": "SubjectWithStats[]", "type_file": "subject",
             "title": "Subjects", "phase_note": "Phase 8 (Subject CRUD)"},
            {"slug": "detail", "pascal": "Detail", "kind": "detail",
             "action_domain": "Subjects", "action_method": "getById",
             "data_type": "SubjectWithStats", "type_file": "subject",
             "param_name": "subjectId",
             "title": "Subject detail", "phase_note": "Phase 8 (Subject CRUD)"},
        ],
    },
    {
        "domain": "lessons",
        "pascal": "Lessons",
        "features": [
            {"slug": "list", "pascal": "List", "kind": "list",
             "action_domain": "Lessons", "action_method": "getAll",
             "data_type": "LessonWithRelations[]", "type_file": "lesson",
             "title": "Lessons", "phase_note": "Phase 9 (Lesson CRUD)"},
            {"slug": "detail", "pascal": "Detail", "kind": "detail",
             "action_domain": "Lessons", "action_method": "getById",
             "data_type": "LessonWithRelations", "type_file": "lesson",
             "param_name": "lessonId",
             "title": "Lesson detail", "phase_note": "Phase 9 (Lesson CRUD)"},
        ],
    },
    {
        "domain": "homework",
        "pascal": "Homework",
        "features": [
            {"slug": "list", "pascal": "List", "kind": "list",
             "action_domain": "Homework", "action_method": "getAll",
             "data_type": "HomeworkWithRelations[]", "type_file": "homework",
             "title": "Homework", "phase_note": "Phase 11 (Homework & Exams)"},
        ],
    },
    {
        "domain": "exams",
        "pascal": "Exams",
        "features": [
            {"slug": "list", "pascal": "List", "kind": "list",
             "action_domain": "Exams", "action_method": "getAll",
             "data_type": "ExamWithRelations[]", "type_file": "exam",
             "title": "Exams", "phase_note": "Phase 11 (Homework & Exams)"},
        ],
    },
    {
        "domain": "study-sessions",
        "pascal": "StudySessions",
        "features": [
            {"slug": "history", "pascal": "History", "kind": "list",
             "action_domain": "StudySessions", "action_method": "getHistory",
             "data_type": "StudySession[]", "type_file": "study-session",
             "title": "Study sessions", "phase_note": "Phase 10 (Study Sessions)"},
        ],
    },
    {
        "domain": "calendar",
        "pascal": "Calendar",
        "features": [
            {"slug": "month", "pascal": "Month", "kind": "calendar",
             "action_domain": "Calendar", "action_method": "getMonth",
             "data_type": "CalendarMonthData", "type_file": "calendar",
             "title": "Calendar", "phase_note": "Phase 12 (Calendar)"},
        ],
    },
    {
        "domain": "search",
        "pascal": "Search",
        "features": [
            {"slug": "results", "pascal": "Results", "kind": "search",
             "action_domain": "Search", "action_method": "search",
             "data_type": "SearchResultItem[]", "type_file": "search",
             "title": "Search results", "phase_note": "final polish phase"},
        ],
    },
    {
        "domain": "statistics",
        "pascal": "Statistics",
        "features": [
            {"slug": "overview", "pascal": "Overview", "kind": "single",
             "action_domain": "Statistics", "action_method": "getOverview",
             "data_type": "StatisticsOverviewData", "type_file": "statistics",
             "title": "Statistics", "phase_note": "Phase 13 (Statistics)"},
        ],
    },
    {
        "domain": "notifications",
        "pascal": "Notifications",
        "features": [
            {"slug": "center", "pascal": "Center", "kind": "list",
             "action_domain": "Notifications", "action_method": "getAll",
             "data_type": "Notification[]", "type_file": "notification",
             "title": "Notifications", "phase_note": "Phase 14 (Notifications)"},
        ],
    },
    {
        "domain": "gamification",
        "pascal": "Gamification",
        "features": [
            {"slug": "achievements", "pascal": "Achievements", "kind": "list",
             "action_domain": "Gamification", "action_method": "getAchievements",
             "data_type": "Achievement[]", "type_file": "achievement",
             "title": "Achievements", "phase_note": "relevant CRUD phases"},
            {"slug": "goals", "pascal": "Goals", "kind": "list",
             "action_domain": "Gamification", "action_method": "getGoals",
             "data_type": "Goal[]", "type_file": "goal",
             "title": "Goals", "phase_note": "relevant CRUD phases"},
        ],
    },
    {
        "domain": "settings",
        "pascal": "Settings",
        "features": [
            {"slug": "profile", "pascal": "Profile", "kind": "single",
             "action_domain": "Settings", "action_method": "get",
             "data_type": "UserSettings", "type_file": "settings",
             "title": "Profile settings", "phase_note": "Phase 16 (Settings)"},
            {"slug": "appearance", "pascal": "Appearance", "kind": "single",
             "action_domain": "Settings", "action_method": "get",
             "data_type": "UserSettings", "type_file": "settings",
             "title": "Appearance settings", "phase_note": "Phase 16 (Settings)"},
            {"slug": "notification-preferences", "pascal": "NotificationPreferences", "kind": "single",
             "action_domain": "Settings", "action_method": "get",
             "data_type": "UserSettings", "type_file": "settings",
             "title": "Notification preferences", "phase_note": "Phase 16 (Settings)"},
            {"slug": "data", "pascal": "Data", "kind": "single",
             "action_domain": "Settings", "action_method": "get",
             "data_type": "UserSettings", "type_file": "settings",
             "title": "Backup & data", "phase_note": "Phase 16 (Settings)"},
        ],
    },
]


def module_dir(domain: str, slug: str) -> str:
    return os.path.join(MODULES, domain, slug)


def page_dir(domain: str, slug: str, param_name: str | None) -> str:
    base = os.path.join(APP, domain, slug)
    if param_name:
        base = os.path.join(base, f"[{param_name}]")
    return base


def gen_feature(domain_pascal: str, domain_slug: str, feat: dict) -> None:
    slug = feat["slug"]
    kind = feat["kind"]
    feat_pascal = feat["pascal"]

    if kind == "form":
        ssr_name = f"{domain_pascal}{feat_pascal}"
        csr_name = f"{feat_pascal}Form"
    else:
        ssr_name = f"{domain_pascal}{feat_pascal}"
        csr_name = f"{ssr_name}View"

    mdir = module_dir(domain_slug, slug)
    ssr_path = os.path.join(mdir, "ssr", f"{ssr_name}.tsx")
    csr_path = os.path.join(mdir, "csr", f"{csr_name}.tsx")
    index_path = os.path.join(mdir, "index.ts")

    # ---- CSR ----
    if kind == "form":
        csr_content = f'''"use client";

import {{ FeaturePlaceholder }} from "@/components/shared/feature-placeholder";

/**
 * Real React Hook Form + Zod form lands in {feat["phase_note"]}.
 */
export const {csr_name} = () => {{
  return (
    <FeaturePlaceholder
      title="{feat["title"]}"
      description="This form will be built in {feat["phase_note"]}."
    />
  );
}};
'''
    elif kind == "detail":
        type_file = feat["type_file"]
        data_type = feat["data_type"]
        param_name = feat["param_name"]
        csr_content = f'''"use client";

import {{ FeaturePlaceholder }} from "@/components/shared/feature-placeholder";
import type {{ {data_type} }} from "@/lib/types/{type_file}";

interface {csr_name}Props {{
  data: {data_type} | null;
  {param_name}: string;
}}

export const {csr_name} = ({{ data, {param_name} }}: {csr_name}Props) => {{
  return (
    <FeaturePlaceholder
      title="{feat["title"]}"
      description={{`Record ${{{param_name}}} will render here starting {feat["phase_note"]}.`}}
      itemCount={{data ? 1 : 0}}
    />
  );
}};
'''
    elif kind == "search":
        type_file = feat["type_file"]
        data_type = feat["data_type"]
        item_type = data_type[:-2] if data_type.endswith("[]") else data_type
        csr_content = f'''"use client";

import {{ FeaturePlaceholder }} from "@/components/shared/feature-placeholder";
import type {{ {item_type} }} from "@/lib/types/{type_file}";

interface {csr_name}Props {{
  data: {data_type};
  query: string;
}}

export const {csr_name} = ({{ data, query }}: {csr_name}Props) => {{
  return (
    <FeaturePlaceholder
      title="{feat["title"]}"
      description={{`Instant search results for "${{query}}" land in {feat["phase_note"]}.`}}
      itemCount={{data.length}}
    />
  );
}};
'''
    else:  # list | single | calendar
        type_file = feat["type_file"]
        data_type = feat["data_type"]
        is_array = data_type.endswith("[]")
        prop_type = data_type if is_array else f"{data_type} | null"
        item_count_expr = "data.length" if is_array else "data ? 1 : 0"
        item_type = data_type[:-2] if is_array else data_type
        csr_content = f'''"use client";

import {{ FeaturePlaceholder }} from "@/components/shared/feature-placeholder";
import type {{ {item_type} }} from "@/lib/types/{type_file}";

interface {csr_name}Props {{
  data: {prop_type};
}}

export const {csr_name} = ({{ data }}: {csr_name}Props) => {{
  return (
    <FeaturePlaceholder
      title="{feat["title"]}"
      description="This view will be built in {feat["phase_note"]}."
      itemCount={{{item_count_expr}}}
    />
  );
}};
'''

    write(csr_path, csr_content)

    # ---- SSR ----
    if kind == "form":
        ssr_content = f'''import {{ {csr_name} }} from "../csr/{csr_name}";

/**
 * TODO({feat["phase_note"]}): redirect away if a session already exists.
 */
export const {ssr_name} = async () => {{
  return <{csr_name} />;
}};
'''
    elif kind == "detail":
        action_domain = feat["action_domain"]
        action_method = feat["action_method"]
        param_name = feat["param_name"]
        ssr_content = f'''import {{ Actions }} from "@/actions";
import {{ {csr_name} }} from "../csr/{csr_name}";

interface {ssr_name}Props {{
  params: Promise<{{ {param_name}: string }}>;
}}

export const {ssr_name} = async ({{ params }}: {ssr_name}Props) => {{
  const {{ {param_name} }} = await params;
  const {{ data }} = await Actions.{action_domain}.{action_method}({param_name});

  return <{csr_name} data={{data}} {param_name}={{{param_name}}} />;
}};
'''
    elif kind == "search":
        action_domain = feat["action_domain"]
        action_method = feat["action_method"]
        ssr_content = f'''import {{ Actions }} from "@/actions";
import {{ {csr_name} }} from "../csr/{csr_name}";

interface {ssr_name}Props {{
  searchParams: Promise<{{ q?: string }}>;
}}

export const {ssr_name} = async ({{ searchParams }}: {ssr_name}Props) => {{
  const {{ q }} = await searchParams;
  const query = q ?? "";
  const {{ data }} = await Actions.{action_domain}.{action_method}(query);
  const safeData = data ?? [];

  return <{csr_name} data={{safeData}} query={{query}} />;
}};
'''
    elif kind == "calendar":
        action_domain = feat["action_domain"]
        action_method = feat["action_method"]
        ssr_content = f'''import {{ Actions }} from "@/actions";
import {{ {csr_name} }} from "../csr/{csr_name}";

export const {ssr_name} = async () => {{
  const now = new Date();
  const {{ data }} = await Actions.{action_domain}.{action_method}(
    now.getFullYear(),
    now.getMonth() + 1,
  );

  return <{csr_name} data={{data}} />;
}};
'''
    else:  # list | single
        action_domain = feat["action_domain"]
        action_method = feat["action_method"]
        data_type = feat["data_type"]
        is_array = data_type.endswith("[]")
        empty_default = "[]" if is_array else "null"
        ssr_content = f'''import {{ Actions }} from "@/actions";
import {{ {csr_name} }} from "../csr/{csr_name}";

export const {ssr_name} = async () => {{
  const {{ data }} = await Actions.{action_domain}.{action_method}();
  const safeData = data ?? {empty_default};

  return <{csr_name} data={{safeData}} />;
}};
'''

    write(ssr_path, ssr_content)

    # ---- index.ts ----
    write(index_path, f'export {{ {ssr_name} }} from "./ssr/{ssr_name}";\n')

    # ---- page.tsx ----
    param_name = feat.get("param_name")
    pdir = page_dir(domain_slug, slug, param_name)
    page_path = os.path.join(pdir, "page.tsx")
    page_fn = f"{domain_pascal}{feat_pascal}Page"

    if kind == "detail":
        page_content = f'''import {{ Suspense }} from "react";
import {{ PageLoader }} from "@/components/shared/page-loader";
import {{ {domain_pascal} }} from "@modules";

interface {page_fn}Props {{
  params: Promise<{{ {param_name}: string }}>;
}}

export default function {page_fn}({{ params }}: {page_fn}Props) {{
  return (
    <Suspense fallback={{<PageLoader />}}>
      <{domain_pascal}.{ssr_name} params={{params}} />
    </Suspense>
  );
}}
'''
    elif kind == "search":
        page_content = f'''import {{ Suspense }} from "react";
import {{ PageLoader }} from "@/components/shared/page-loader";
import {{ {domain_pascal} }} from "@modules";

interface {page_fn}Props {{
  searchParams: Promise<{{ q?: string }}>;
}}

export default function {page_fn}({{ searchParams }}: {page_fn}Props) {{
  return (
    <Suspense fallback={{<PageLoader />}}>
      <{domain_pascal}.{ssr_name} searchParams={{searchParams}} />
    </Suspense>
  );
}}
'''
    else:
        page_content = f'''import {{ Suspense }} from "react";
import {{ PageLoader }} from "@/components/shared/page-loader";
import {{ {domain_pascal} }} from "@modules";

export default function {page_fn}() {{
  return (
    <Suspense fallback={{<PageLoader />}}>
      <{domain_pascal}.{ssr_name} />
    </Suspense>
  );
}}
'''

    write(page_path, page_content)


def gen_domain_index(domain_slug: str, features: list[dict]) -> None:
    lines = [f'export * from "./{f["slug"]}";' for f in features]
    write(os.path.join(MODULES, domain_slug, "index.ts"), "\n".join(lines) + "\n")


def gen_modules_root() -> None:
    lines = [
        f'export * as {d["pascal"]} from "./{d["domain"]}";' for d in DOMAINS
    ]
    write(os.path.join(MODULES, "index.ts"), "\n".join(lines) + "\n")


def main() -> None:
    for d in DOMAINS:
        for f in d["features"]:
            gen_feature(d["pascal"], d["domain"], f)
        gen_domain_index(d["domain"], d["features"])
    gen_modules_root()
    print("Phase 2 scaffold generated.")


if __name__ == "__main__":
    main()
