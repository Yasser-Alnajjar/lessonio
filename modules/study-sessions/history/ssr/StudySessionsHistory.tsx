import { Actions } from "@/actions";
import { StudySessionsHistoryView } from "../csr/StudySessionsHistoryView";

export const StudySessionsHistory = async () => {
  const [{ data: sessions }, { data: subjects }, { data: lessons }] =
    await Promise.all([
      Actions.StudySessions.getHistory(),
      Actions.Subjects.getAll(),
      Actions.Lessons.getAll(),
    ]);

  return (
    <StudySessionsHistoryView
      data={sessions ?? []}
      subjects={subjects ?? []}
      lessons={(lessons ?? []).filter((lesson) => !lesson.isArchived)}
    />
  );
};
