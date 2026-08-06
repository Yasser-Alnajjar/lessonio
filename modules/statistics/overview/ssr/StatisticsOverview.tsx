import { Actions } from "@/actions";
import { StatisticsOverviewView } from "../csr/StatisticsOverviewView";

export const StatisticsOverview = async () => {
  const { data } = await Actions.Statistics.getOverview();
  const safeData = data ?? null;

  return <StatisticsOverviewView data={safeData} />;
};
