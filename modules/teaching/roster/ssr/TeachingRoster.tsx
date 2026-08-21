import { Actions } from "@/actions";
import { TeachingRosterView } from "../csr/TeachingRosterView";

interface TeachingRosterProps {
  params: Promise<{ classId: string }>;
}

export const TeachingRoster = async ({ params }: TeachingRosterProps) => {
  const { classId } = await params;

  const [{ data: classItem }, { data: roster }] = await Promise.all([
    Actions.TeacherClasses.getById(classId),
    Actions.TeacherClasses.getRoster(classId),
  ]);

  return <TeachingRosterView classItem={classItem} roster={roster ?? []} />;
};
