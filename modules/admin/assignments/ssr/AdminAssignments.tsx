import { Actions } from "@/actions";
import { AdminAssignmentsView } from "../csr/AdminAssignmentsView";

interface AdminAssignmentsProps {
  searchParams: Promise<{
    page?: string;
    perPage?: string;
    q?: string;
    status?: string;
  }>;
}

export const AdminAssignments = async ({
  searchParams,
}: AdminAssignmentsProps) => {
  const { page, perPage, q, status } = await searchParams;

  const result = await Actions.Admin.getAssignments({
    page: page ? Number(page) : undefined,
    perPage: perPage ? Number(perPage) : undefined,
    q,
    status,
  });

  return (
    <AdminAssignmentsView
      data={result.data}
      meta={result.meta}
      filters={{ q: q ?? "", status: status ?? "" }}
    />
  );
};
