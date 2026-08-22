import { Actions } from "@/actions";
import { ClassroomAssignmentDetailView } from "../csr/ClassroomAssignmentDetailView";

interface ClassroomAssignmentDetailProps {
  params: Promise<{ assignmentId: string }>;
}

export const ClassroomAssignmentDetail = async ({
  params,
}: ClassroomAssignmentDetailProps) => {
  const { assignmentId } = await params;
  const [{ data: assignment }, { data: submission }] = await Promise.all([
    Actions.Assignments.getById(assignmentId),
    Actions.Submissions.getMine(assignmentId),
  ]);

  return (
    <ClassroomAssignmentDetailView
      assignment={assignment}
      submission={submission}
    />
  );
};
