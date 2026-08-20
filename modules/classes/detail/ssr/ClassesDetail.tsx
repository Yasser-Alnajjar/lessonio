import { Actions } from "@/actions";
import { ClassesDetailView } from "../csr/ClassesDetailView";

interface ClassesDetailProps {
  params: Promise<{ classId: string }>;
}

export const ClassesDetail = async ({ params }: ClassesDetailProps) => {
  const { classId } = await params;

  const [{ data: klass }, { data: subjects }] = await Promise.all([
    Actions.Classes.getById(classId),
    Actions.Subjects.getAll(),
  ]);

  return (
    <ClassesDetailView data={klass} classId={classId} subjects={subjects ?? []} />
  );
};
