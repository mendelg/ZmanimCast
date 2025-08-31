import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { HDate } from "@hebcal/hdate";

export default function Command() {
  const { menuAfterSunsetShift } = getPreferenceValues<{ menuAfterSunsetShift: boolean }>();
  const now = new Date();
  if (menuAfterSunsetShift) now.setDate(now.getDate() + 1);
  const hd = new HDate(now);
  const label = `${hd.getDate()} ${hd.getMonthName()} ${hd.getFullYear()}`;
  return <MenuBarExtra title={label} tooltip="Hebrew date (simple after-sunset approximation)" />;
}
