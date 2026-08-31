import { Actions } from "@/actions";
import { AdminTeacherClassesView } from "../csr/AdminTeacherClassesView";

interface AdminTeacherClassesProps {
  searchParams: Promise<{
    page?: string;
    perPage?: string;
    q?: string;
    archived?: string;
  }>;
}

export const AdminTeacherClasses = async ({
  searchParams,
}: AdminTeacherClassesProps) => {
  const { page, perPage, q, archived } = await searchParams;

  const result = await Actions.Admin.getClasses({
    page: page ? Number(page) : undefined,
    perPage: perPage ? Number(perPage) : undefined,
    q,
    archived,
  });

  return (
    <AdminTeacherClassesView
      data={result.data}
      meta={result.meta}
      filters={{ q: q ?? "", archived: archived ?? "" }}
    />
  );
};
