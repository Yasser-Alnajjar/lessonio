import { Actions } from "@/actions";
import { StudySessionsHistoryView } from "../csr/StudySessionsHistoryView";

export const StudySessionsHistory = async () => {
  const { data } = await Actions.StudySessions.getHistory();
  const safeData = data ?? [];

  return <StudySessionsHistoryView data={safeData} />;
};
