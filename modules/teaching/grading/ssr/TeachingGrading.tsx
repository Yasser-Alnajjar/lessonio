import { Actions } from "@/actions";
import { TeachingGradingView } from "../csr/TeachingGradingView";

interface TeachingGradingProps {
  params: Promise<{ assignmentId: string }>;
}

export const TeachingGrading = async ({ params }: TeachingGradingProps) => {
  const { assignmentId } = await params;

  const [{ data: assignment }, { data: queue }] = await Promise.all([
    Actions.Assignments.getById(assignmentId),
    Actions.Submissions.getByAssignment(assignmentId),
  ]);

  return <TeachingGradingView assignment={assignment} queue={queue ?? []} />;
};
