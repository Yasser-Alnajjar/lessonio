import { Actions } from "@/actions";
import { ClassroomAssignmentDetailView } from "../csr/ClassroomAssignmentDetailView";

interface ClassroomAssignmentDetailProps {
  params: Promise<{ assignmentId: string }>;
}

export const ClassroomAssignmentDetail = async ({
  params,
}: ClassroomAssignmentDetailProps) => {
  const { assignmentId } = await params;
  const { data: assignment } = await Actions.Assignments.getById(assignmentId);

  return <ClassroomAssignmentDetailView assignment={assignment} />;
};
