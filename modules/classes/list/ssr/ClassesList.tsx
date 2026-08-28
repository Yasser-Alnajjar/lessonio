import { Actions } from "@/actions";
import { ClassesListView } from "../csr/ClassesListView";

/**
 * The single page for the Class domain: today's and upcoming occurrences on
 * top, the recurring weekly classes that produce them below. Both come from
 * the same source of truth — the agenda is materialized from the very
 * classes listed underneath it.
 */
export const ClassesList = async () => {
  const [
    { data: agenda },
    { data: classes },
    { data: subjects },
    { data: enrolledClasses },
  ] = await Promise.all([
    Actions.ClassOccurrences.getAgenda(),
    Actions.Classes.getAll(),
    Actions.Subjects.getAll(),
    Actions.Enrollments.getMyClasses(),
  ]);

  return (
    <ClassesListView
      today={agenda?.today ?? []}
      upcoming={agenda?.upcoming ?? []}
      classes={classes ?? []}
      subjects={subjects ?? []}
      enrolledClasses={enrolledClasses ?? []}
    />
  );
};
