import { Actions } from "@/actions";
import { GradesOverviewView } from "../csr/GradesOverviewView";

export const GradesOverview = async () => {
  const { data } = await Actions.Grades.getOverview();

  return (
    <GradesOverviewView data={data ?? { subjects: [], gpa: null, trend: [] }} />
  );
};
