import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { HDate } from "@hebcal/hdate";

export default function Command() {
  const [input, setInput] = useState<string>("");
  const { push } = useNavigation();

  function parseHebrewDate(str: string): HDate | null {
    const s = str.trim();
    if (!s) return null;

    try {
      // @ts-ignore
      const maybe = HDate.fromGematriyaString?.(s);
      if (maybe && // @ts-ignore
          (maybe.getFullYear?.() || maybe.getFullYear)) return maybe as HDate;
    } catch {}

    const parts = s.replace(/[,:\-/]/g, " ").split(" ").filter(Boolean);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parts.slice(1, parts.length - 1).join(" ");
      const year = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(day) && !Number.isNaN(year)) {
        try { return new HDate(day, month, year); } catch {}
      }
    }
    return null;
  }

  function convert() {
    const hd = parseHebrewDate(input);
    if (!hd) {
      push(<Detail markdown={`# Hebrew → Gregorian

**Error:** Could not parse "${input}".

Examples:
- \`7 Elul 5785\`
- \`כ"ז בתמוז תשפ"ג\``} />);
      return;
    }
    const date = hd.greg();
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const line = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    push(
      <Detail
        markdown={`# Hebrew → Gregorian

**Input:** ${input}

**Gregorian:** ${line}

> Note: This returns the civil daytime date. Hebrew days begin at sunset.`}
        actions={<ActionPanel>
          <Action.CopyToClipboard title="Copy Date (YYYY-MM-DD)" content={line} />
          <Action.CopyToClipboard title="Copy ISO Date" content={date.toISOString()} icon={Icon.Clipboard} />
        </ActionPanel>}
      />
    );
  }

  return (
    <Form actions={<ActionPanel><Action.SubmitForm title="Convert" onSubmit={convert} icon={Icon.ArrowRight} /></ActionPanel>}>
      <Form.TextField id="hebrew" title="Hebrew Date" placeholder="e.g., 7 Elul 5785 or כ״ז בתמוז תשפ״ג" value={input} onChange={setInput} />
      <Form.Description text="Supported: English months (including Adar II) or Hebrew gematriya strings." />
    </Form>
  );
}
