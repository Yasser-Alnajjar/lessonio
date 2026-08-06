import { Actions } from "@/actions";
import { LessonsDetailView } from "../csr/LessonsDetailView";

interface LessonsDetailProps {
  params: Promise<{ lessonId: string }>;
}

export const LessonsDetail = async ({ params }: LessonsDetailProps) => {
  const { lessonId } = await params;
  const { data } = await Actions.Lessons.getById(lessonId);

  return <LessonsDetailView data={data} lessonId={lessonId} />;
};
