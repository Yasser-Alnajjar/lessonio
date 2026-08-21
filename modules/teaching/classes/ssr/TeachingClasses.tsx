import { Actions } from "@/actions";
import { TeachingClassesView } from "../csr/TeachingClassesView";

export const TeachingClasses = async () => {
  const { data: classes } = await Actions.TeacherClasses.getAll();

  return <TeachingClassesView classes={classes ?? []} />;
};
