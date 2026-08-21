import { Actions } from "@/actions";
import { HomeworkListView } from "../csr/HomeworkListView";

export const HomeworkList = async () => {
  const [
    { data: homework },
    { data: lessons },
    { data: subjects },
    { data: assignedWork },
  ] = await Promise.all([
    Actions.Homework.getAll(),
    Actions.Lessons.getAll(),
    Actions.Subjects.getAll(),
    Actions.Assignments.getAssignedToMe(),
  ]);

  return (
    <HomeworkListView
      data={homework ?? []}
      lessons={(lessons ?? []).filter((lesson) => !lesson.isArchived)}
      subjects={subjects ?? []}
      assignedWork={assignedWork ?? []}
    />
  );
};
