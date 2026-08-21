import { Actions } from "@/actions";
import { ClassroomAssignmentsView } from "../csr/ClassroomAssignmentsView";

/**
 * Follows the same rule as `/classroom/classes`: loads for any student,
 * showing a plain empty state when they have no classes or no published
 * assignments. Nothing about this route requires a teacher connection.
 */
export const ClassroomAssignments = async () => {
  const { data: assignments } = await Actions.Assignments.getAssignedToMe();

  return <ClassroomAssignmentsView assignments={assignments ?? []} />;
};
