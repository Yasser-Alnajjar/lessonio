import { Actions } from "@/actions";
import { LessonsListView } from "../csr/LessonsListView";

export const LessonsList = async () => {
  const { data } = await Actions.Lessons.getAll();
  const safeData = data ?? [];

  return <LessonsListView data={safeData} />;
};
