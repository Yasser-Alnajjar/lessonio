import { Actions } from "@/actions";
import { ClassroomClassesView } from "../csr/ClassroomClassesView";

/**
 * A student with zero enrollments sees a welcoming empty state here, not an
 * error — this is the default, most common student. Nothing about this
 * route requires a teacher connection to load.
 */
export const ClassroomClasses = async () => {
  const { data: classes } = await Actions.Enrollments.getMyClasses();

  return <ClassroomClassesView classes={classes ?? []} />;
};
