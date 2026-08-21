import { Actions } from "@/actions";
import { TeachingAssignmentsView } from "../csr/TeachingAssignmentsView";

export const TeachingAssignments = async () => {
  const [{ data: assignments }, { data: classes }] = await Promise.all([
    Actions.Assignments.getAll(),
    Actions.TeacherClasses.getAll(),
  ]);

  return (
    <TeachingAssignmentsView
      assignments={assignments ?? []}
      classes={classes ?? []}
    />
  );
};
