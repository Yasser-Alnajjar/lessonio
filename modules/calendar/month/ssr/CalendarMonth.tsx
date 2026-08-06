import { Actions } from "@/actions";
import { CalendarMonthView } from "../csr/CalendarMonthView";

export const CalendarMonth = async () => {
  const now = new Date();
  const { data } = await Actions.Calendar.getMonth(
    now.getFullYear(),
    now.getMonth() + 1,
  );

  return <CalendarMonthView data={data} />;
};
