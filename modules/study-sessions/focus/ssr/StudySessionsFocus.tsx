import { Actions } from "@/actions";
import { StudySessionsFocusView } from "../csr/StudySessionsFocusView";

export const StudySessionsFocus = async () => {
  const [{ data: running }, { data: subjects }, { data: lessons }, { data: summary }] =
    await Promise.all([
      Actions.StudySessions.getRunning(),
      Actions.Subjects.getAll(),
      Actions.Lessons.getAll(),
      Actions.StudySessions.getSummary(),
    ]);

  return (
    <StudySessionsFocusView
      running={running}
      subjects={subjects ?? []}
      lessons={(lessons ?? []).filter((lesson) => !lesson.isArchived)}
      summary={summary}
    />
  );
};
