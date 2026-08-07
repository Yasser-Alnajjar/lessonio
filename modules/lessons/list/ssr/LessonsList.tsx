import { Actions } from "@/actions";
import { LessonsListView } from "../csr/LessonsListView";

export const LessonsList = async () => {
  const [{ data: lessons }, { data: subjects }, { data: tags }] = await Promise.all([
    Actions.Lessons.getAll(),
    Actions.Subjects.getAll(),
    Actions.Tags.getAll(),
  ]);

  return (
    <LessonsListView
      data={lessons ?? []}
      subjects={subjects ?? []}
      tags={tags ?? []}
    />
  );
};
