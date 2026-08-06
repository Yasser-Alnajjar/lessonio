import { Actions } from "@/actions";
import { HomeworkListView } from "../csr/HomeworkListView";

export const HomeworkList = async () => {
  const { data } = await Actions.Homework.getAll();
  const safeData = data ?? [];

  return <HomeworkListView data={safeData} />;
};
