import { Actions } from "@/actions";
import { CalendarMonthView } from "../csr/CalendarMonthView";

interface CalendarMonthProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export const CalendarMonth = async ({ searchParams }: CalendarMonthProps) => {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;

  const [{ data }, { data: subjects }] = await Promise.all([
    Actions.Calendar.getMonth(year, month),
    Actions.Subjects.getAll(),
  ]);

  return <CalendarMonthView data={data} subjects={subjects ?? []} year={year} month={month} />;
};
