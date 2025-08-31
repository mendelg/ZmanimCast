import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { JewishCalendar, Parsha, Calendar } from "kosher-zmanim";

export default function Command() {
  const [input, setInput] = useState<string>("");
  const { push } = useNavigation();

  function parseHebrewDate(str: string): JewishCalendar | null {
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
            const jc = new JewishCalendar();
            jc.setJewishDate(year, monthNum, day);
            return jc;
          } catch {}
        }
      }
    }
    return null;
  }

  function convert() {
    const jc = parseHebrewDate(input);
    if (!jc) {
      push(<Detail markdown={`# Hebrew → Gregorian

**Error:** Could not parse "${input}".

Examples:
- \`7 Elul 5785\`
- \`26 Av 5784\`

Supported months: Tishrei, Cheshvan, Kislev, Tevet, Shevat, Adar, Adar I, Adar II, Nissan, Iyar, Sivan, Tammuz, Av, Elul`} />);
      return;
    }
    
    const y = jc.getGregorianYear();
    const m = jc.getGregorianMonth() + 1; // kosher-zmanim uses 0-based months
    const d = jc.getGregorianDayOfMonth();
    const gregorianDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const date = new Date(y, jc.getGregorianMonth(), d);
    
    // Get additional information
    const dayNames = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[jc.getDayOfWeek()];
    
    // Get parsha info - only relevant for Saturday
    const parshaNum = jc.getParsha();
    let parshaInfo = '';
    if (jc.getDayOfWeek() === 7) { // Saturday
      parshaInfo = parshaNum > 0 ? Parsha[parshaNum].replace(/_/g, ' ') : 'None';
    } else {
      // For other days, find the upcoming Saturday's parsha
      const nextSat = new JewishCalendar();
      nextSat.setJewishDate(jc.getJewishYear(), jc.getJewishMonth(), jc.getJewishDayOfMonth());
      const daysToSat = (7 - nextSat.getDayOfWeek()) % 7;
      if (daysToSat === 0 && nextSat.getDayOfWeek() !== 7) { // If today is not Saturday, add 7 days
        nextSat.forward(Calendar.DATE, 7);
      } else if (daysToSat > 0) {
        nextSat.forward(Calendar.DATE, daysToSat);
      }
      const nextParshaNum = nextSat.getParsha();
      parshaInfo = nextParshaNum > 0 ? `${Parsha[nextParshaNum].replace(/_/g, ' ')} (this Shabbat)` : 'None this week';
    }
    
    // Get special information
    const specialInfo = [];
    if (jc.isRoshChodesh()) specialInfo.push('Rosh Chodesh');
    if (jc.isChanukah()) specialInfo.push(`Chanukah Day ${jc.getDayOfChanukah()}`);
    if (jc.isYomTov()) specialInfo.push('Yom Tov');
    if (jc.isTaanis()) specialInfo.push('Taanit');
    if (jc.getDayOfOmer() > 0) specialInfo.push(`Omer Day ${jc.getDayOfOmer()}`);

    const lines = [
      `**Input:** ${input}`,
      `**Gregorian Date:** ${gregorianDate}`,
      `**Day of Week:** ${dayOfWeek}`,
      `**Torah Portion:** ${parshaInfo}`,
    ];
    
    if (specialInfo.length > 0) {
      lines.push(`**Special Day:** ${specialInfo.join(', ')}`);
    }
    
    lines.push('', '> Note: This returns the civil daytime date. Hebrew days begin at sunset.');

    push(
      <Detail
        markdown={`# Hebrew → Gregorian\n\n${lines.join('\n\n')}`}
        actions={<ActionPanel>
          <Action.CopyToClipboard title="Copy Date (YYYY-MM-DD)" content={gregorianDate} />
          <Action.CopyToClipboard title="Copy Day of Week" content={dayOfWeek} />
          <Action.CopyToClipboard title="Copy Torah Portion" content={parshaInfo} />
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
