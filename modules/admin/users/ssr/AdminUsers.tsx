import { Actions } from "@/actions";
import { AdminUsersView } from "../csr/AdminUsersView";

interface AdminUsersProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    role?: string;
    perPage?: number;
  }>;
}

export const AdminUsers = async ({ searchParams }: AdminUsersProps) => {
  const { page, q, role, perPage } = await searchParams;

  const [{ data: session }, result] = await Promise.all([
    Actions.Auth.getSession(),
    Actions.Admin.getUsers({
      page: page ? Number(page) : undefined,
      q,
      perPage,
      role,
    }),
  ]);

  return (
    <AdminUsersView
      data={result.data}
      meta={result.meta}
      currentUserId={session?.id ?? null}
      filters={{ q: q ?? "", role: role ?? "" }}
    />
  );
};
