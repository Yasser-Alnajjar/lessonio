import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Gamification } from "@modules";

export default function GamificationAchievementsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Gamification.GamificationAchievements />
    </Suspense>
  );
}
