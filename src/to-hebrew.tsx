import { Action, ActionPanel, Clipboard, Detail, Form, Icon, useNavigation, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { HDate } from "@hebcal/hdate";

export default function Command() {
  const { afterSunsetShift } = getPreferenceValues<{ afterSunsetShift: boolean }>();
  const [date, setDate] = useState<Date>(new Date());
  const { push } = useNavigation();

  function convert() {
    const d = new Date(date);
    if (afterSunsetShift) {
      d.setDate(d.getDate() + 1);
    }
    const hd = new HDate(d);
    const translit = `${hd.getDate()} ${hd.getMonthName()} ${hd.getFullYear()}`;
    // @ts-ignore - some builds expose renderGematriya
    const gematriya = hd.renderGematriya ? hd.renderGematriya() : translit;

    push(
      <Result
        title="Gregorian → Hebrew"
        lines={{
          "Transliterated": translit,
          "Gematriya": gematriya,
          "Month (Tishrei-based #)": String(hd.getTishreiMonth()),
        }}
      />
    );
  }

  return (
    <Form actions={<ActionPanel><Action.SubmitForm title="Convert" onSubmit={convert} icon={Icon.ArrowRight} /></ActionPanel>}>
      <Form.DatePicker id="date" title="Gregorian Date" value={date} onChange={(d) => d && setDate(d)} />
      <Form.Description text="Tip: Toggle the 'after sunset' preference in the command settings if needed." />
    </Form>
  );
}

function Result({ title, lines }: { title: string; lines: Record<string, string> }) {
  const md = [
    `# ${title}`,
    "",
    ...Object.entries(lines).map(([k, v]) => `**${k}:** ${v}`),
  ].join("\n");

  const copyAll = Object.values(lines).join(" | ");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Transliterated" content={lines["Transliterated"]} />
          <Action.CopyToClipboard title="Copy Gematriya" content={lines["Gematriya"]} />
          <Action title="Copy All" onAction={() => Clipboard.copy(copyAll)} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
}
