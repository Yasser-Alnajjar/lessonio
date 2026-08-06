import { Actions } from "@/actions";
import { DashboardOverviewView } from "../csr/DashboardOverviewView";

export const DashboardOverview = async () => {
  const { data } = await Actions.Dashboard.getOverview();
  const safeData = data ?? null;

  return <DashboardOverviewView data={safeData} />;
};
