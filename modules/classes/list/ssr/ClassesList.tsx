import { Actions } from "@/actions";
import { ClassesListView } from "../csr/ClassesListView";

export const ClassesList = async () => {
  const [{ data: classes }, { data: subjects }] = await Promise.all([
    Actions.Classes.getAll(),
    Actions.Subjects.getAll(),
  ]);

  return <ClassesListView data={classes ?? []} subjects={subjects ?? []} />;
};
