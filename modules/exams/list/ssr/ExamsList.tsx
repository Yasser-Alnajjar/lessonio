import { Actions } from "@/actions";
import { ExamsListView } from "../csr/ExamsListView";

export const ExamsList = async () => {
  const { data } = await Actions.Exams.getAll();
  const safeData = data ?? [];

  return <ExamsListView data={safeData} />;
};
