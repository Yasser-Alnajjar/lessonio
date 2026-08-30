import { Actions } from "@/actions";
import { ExamsListView } from "../csr/ExamsListView";

export const ExamsList = async () => {
  const [{ data: exams }, { data: lessons }, { data: subjects }] =
    await Promise.all([
      Actions.Exams.getAll(),
      Actions.Lessons.getAll(),
      Actions.Subjects.getAll(),
    ]);

  return (
    <ExamsListView
      data={exams ?? []}
      lessons={(lessons ?? []).filter((lesson) => !lesson.isArchived)}
      subjects={subjects ?? []}
    />
  );
};
