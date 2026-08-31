import { Actions } from "@/actions";
import { AdminNotificationJobsView } from "../csr/AdminNotificationJobsView";

interface AdminNotificationJobsProps {
  searchParams: Promise<{
    page?: string;
    perPage?: string;
    status?: string;
    eventType?: string;
  }>;
}

export const AdminNotificationJobs = async ({
  searchParams,
}: AdminNotificationJobsProps) => {
  const { page, perPage, status, eventType } = await searchParams;

  const [result, { data: stats }] = await Promise.all([
    Actions.Admin.getNotificationJobs({
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined,
      status,
      eventType,
    }),
    Actions.Admin.getNotificationJobStats(),
  ]);

  return (
    <AdminNotificationJobsView
      data={result.data}
      meta={result.meta}
      stats={stats}
      filters={{ status: status ?? "", eventType: eventType ?? "" }}
    />
  );
};
