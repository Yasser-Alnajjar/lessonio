import { Actions } from "@/actions";
import { ClassSchedulesListView } from "../csr/ClassSchedulesListView";

export const ClassSchedulesList = async () => {
  const [{ data: schedules }, { data: subjects }] = await Promise.all([
    Actions.ClassSchedules.getAll(),
    Actions.Subjects.getAll(),
  ]);

  return (
    <ClassSchedulesListView
      data={schedules ?? []}
      subjects={subjects ?? []}
    />
  );
};
