import { Actions } from "@/actions";
import { SubjectsListView } from "../csr/SubjectsListView";

export const SubjectsList = async () => {
  const { data } = await Actions.Subjects.getAll();
  const safeData = data ?? [];

  return <SubjectsListView data={safeData} />;
};
