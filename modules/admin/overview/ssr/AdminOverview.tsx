import { Actions } from "@/actions";
import { AdminOverviewView } from "../csr/AdminOverviewView";

export const AdminOverview = async () => {
  const { data } = await Actions.Admin.getOverview();

  return <AdminOverviewView data={data} />;
};
