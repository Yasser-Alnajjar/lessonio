import { Actions } from "@/actions";
import { GamificationGoalsView } from "../csr/GamificationGoalsView";

export const GamificationGoals = async () => {
  const { data } = await Actions.Gamification.getGoals();
  const safeData = data ?? [];

  return <GamificationGoalsView data={safeData} />;
};
