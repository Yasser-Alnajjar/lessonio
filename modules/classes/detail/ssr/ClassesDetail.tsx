import { Actions } from "@/actions";
import { ClassesDetailView } from "../csr/ClassesDetailView";

interface ClassesDetailProps {
  params: Promise<{ classId: string }>;
}

/**
 * One recurring class: its weekly meetings, plus the occurrences it has
 * produced so each date's attendance and exam state can be recorded
 * independently.
 */
export const ClassesDetail = async ({ params }: ClassesDetailProps) => {
  const { classId } = await params;

  const [{ data: klass }, { data: occurrences }, { data: subjects }] =
    await Promise.all([
      Actions.Classes.getById(classId),
      Actions.ClassOccurrences.getAll({ classId }),
      Actions.Subjects.getAll(),
    ]);

  return (
    <ClassesDetailView
      data={klass}
      occurrences={occurrences ?? []}
      subjects={subjects ?? []}
    />
  );
};
