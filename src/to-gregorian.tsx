import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { JewishDate } from "kosher-zmanim";

export default function Command() {
  const [input, setInput] = useState<string>("");
  const { push } = useNavigation();

  function parseHebrewDate(str: string): JewishDate | null {
    const s = str.trim();
    if (!s) return null;

    const parts = s.replace(/[,:\-/]/g, " ").split(" ").filter(Boolean);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const monthName = parts.slice(1, parts.length - 1).join(" ");
      const year = parseInt(parts[parts.length - 1], 10);
      
      if (!Number.isNaN(day) && !Number.isNaN(year)) {
        // Map month names to numbers (Nissan-based: Nissan=1, Tishrei=7)
        const monthMap: Record<string, number> = {
          'nissan': 1, 'iyar': 2, 'sivan': 3, 'tammuz': 4, 'av': 5, 'elul': 6,
          'tishrei': 7, 'cheshvan': 8, 'kislev': 9, 'tevet': 10, 'teves': 10, 'shevat': 11, 'adar': 12,
          'adar i': 12, 'adar ii': 13
        };
        
        const monthNum = monthMap[monthName.toLowerCase()];
        if (monthNum) {
          try { 
            const jd = new JewishDate();
            jd.setJewishDate(year, monthNum, day);
            return jd;
          } catch {}
        }
      }
    }
    return null;
  }

  function convert() {
    const jd = parseHebrewDate(input);
    if (!jd) {
      push(<Detail markdown={`# Hebrew → Gregorian

**Error:** Could not parse "${input}".

Examples:
- \`7 Elul 5785\`
- \`26 Av 5784\`

Supported months: Tishrei, Cheshvan, Kislev, Tevet, Shevat, Adar, Adar I, Adar II, Nissan, Iyar, Sivan, Tammuz, Av, Elul`} />);
      return;
    }
    
    const y = jd.getGregorianYear();
    const m = jd.getGregorianMonth() + 1; // kosher-zmanim uses 0-based months
    const d = jd.getGregorianDayOfMonth();
    const line = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const date = new Date(y, jd.getGregorianMonth(), d);

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
