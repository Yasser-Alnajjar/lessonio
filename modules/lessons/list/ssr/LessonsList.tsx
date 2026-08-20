import { Actions } from "@/actions";
import { LessonsListView } from "../csr/LessonsListView";

export const LessonsList = async () => {
  const [{ data: lessons }, { data: subjects }, { data: tags }, { data: classes }] =
    await Promise.all([
      Actions.Lessons.getAll(),
      Actions.Subjects.getAll(),
      Actions.Tags.getAll(),
      Actions.Classes.getAll(),
    ]);

  return (
    <LessonsListView
      data={lessons ?? []}
      subjects={subjects ?? []}
      tags={tags ?? []}
      classes={classes ?? []}
    />
  );
};
