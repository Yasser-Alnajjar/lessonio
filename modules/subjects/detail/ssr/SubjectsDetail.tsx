import { Actions } from "@/actions";
import { SubjectsDetailView } from "../csr/SubjectsDetailView";

interface SubjectsDetailProps {
  params: Promise<{ subjectId: string }>;
}

export const SubjectsDetail = async ({ params }: SubjectsDetailProps) => {
  const { subjectId } = await params;
  const { data } = await Actions.Subjects.getById(subjectId);

  return <SubjectsDetailView data={data} subjectId={subjectId} />;
};
