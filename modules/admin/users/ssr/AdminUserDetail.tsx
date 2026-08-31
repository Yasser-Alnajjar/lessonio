import { Actions } from "@/actions";
import { AdminUserDetailView } from "../csr/AdminUserDetailView";

interface AdminUserDetailProps {
  userId: string;
}

export const AdminUserDetail = async ({ userId }: AdminUserDetailProps) => {
  const [{ data: session }, { data }] = await Promise.all([
    Actions.Auth.getSession(),
    Actions.Admin.getUserById(userId),
  ]);

  return (
    <AdminUserDetailView data={data} currentUserId={session?.id ?? null} />
  );
};
