import { Actions } from "@/actions";
import { HelpListView } from "../csr/HelpListView";

export const HelpList = async () => {
  const { data: subjects } = await Actions.Subjects.getAll();
  const isNewUser = (subjects ?? []).length === 0;

  return <HelpListView isNewUser={isNewUser} />;
};
