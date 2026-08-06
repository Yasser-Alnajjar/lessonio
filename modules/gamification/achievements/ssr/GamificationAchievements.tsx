import { Actions } from "@/actions";
import { GamificationAchievementsView } from "../csr/GamificationAchievementsView";

export const GamificationAchievements = async () => {
  const { data } = await Actions.Gamification.getAchievements();
  const safeData = data ?? [];

  return <GamificationAchievementsView data={safeData} />;
};
