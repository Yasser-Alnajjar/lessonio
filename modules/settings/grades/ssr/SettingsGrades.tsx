import { Actions } from "@/actions";
import { SettingsGradesView } from "../csr/SettingsGradesView";

export const SettingsGrades = async () => {
  const { data } = await Actions.Settings.get();

  return <SettingsGradesView scale={data?.gradeScale ?? null} />;
};
