import { Action, ActionPanel, List, Toast, showToast, LocalStorage } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";
import Fuse from "fuse.js";
import { getZmanimJson } from "kosher-zmanim";
import { HDate } from "@hebcal/hdate";

export default function ZmanimTodayCommand() {
  const [allPairs, setAllPairs] = useState<{ key: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationName, setLocationName] = useState("");

  const fuse = useMemo(() => new Fuse(allPairs, { includeScore: true, threshold: 0.4, keys: ["key", "value"] }), [allPairs]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return allPairs;
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse, allPairs]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await LocalStorage.getItem<string>("zmanim:lastLocation");
        if (!stored) throw new Error("No saved location. Open 'Kosher Zmanim' and select an address first.");
        
        const { locationName, lat, lon, tz } = JSON.parse(stored) as { locationName: string; lat: number; lon: number; tz: string };
        setLocationName(locationName);
        
        const opts = { 
          date: new Date(), 
          locationName, 
          latitude: lat, 
          longitude: lon, 
          timeZoneId: tz, 
          elevation: 0, 
          complexZmanim: true 
        } as any;
        
        const data = await getZmanimJson(opts);
        const todayHd = new HDate(new Date());
        const hebrewToday = `${todayHd.getDate()} ${todayHd.getMonthName()} ${todayHd.getFullYear()}`;
        
        const entries: { key: string; value: string }[] = [
          { key: "Hebrew Date", value: hebrewToday }
        ];
        
        if (data?.metadata) {
          for (const [k, v] of Object.entries(data.metadata)) {
            entries.push({ key: `meta:${k}`, value: String(v) });
          }
        }
        
        if (data?.Zmanim) {
          for (const [k, v] of Object.entries<any>(data.Zmanim)) {
            entries.push({ key: k, value: String(v) });
          }
        }
        
        setAllPairs(entries);
      } catch (e: any) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to load zmanim", message: String(e?.message || e) });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  function formatLocal(s: string) {
    if (!s || s === "N/A") return s;
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(d);
  }

  const jsonPretty = useMemo(() => JSON.stringify(Object.fromEntries(filtered.map(p => [p.key, p.value])), null, 2), [filtered]);

  return (
    <List 
      isLoading={isLoading}
      searchBarPlaceholder="Search today's zmanim… (e.g., alos, netz, shkia, tzais)" 
      onSearchTextChange={setQuery} 
      searchText={query} 
      throttle
    >
      <List.Section title={`Today's Zmanim${locationName ? ` - ${locationName}` : ""}`}>
        {filtered
          .filter((p) => !p.key.startsWith("meta:"))
          .map((p) => (
            <List.Item
              key={p.key}
              title={p.key}
              subtitle={p.value}
              accessories={[{ text: formatLocal(p.value) }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Time" content={p.value} />
                  <Action.CopyToClipboard title="Copy Name" content={p.key} />
                  <Action.CopyToClipboard title="Copy Name + Time" content={`${p.key}: ${p.value}`} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      
      <List.Section title="Metadata">
        {filtered
          .filter((p) => p.key.startsWith("meta:"))
          .map((p) => (
            <List.Item
              key={p.key}
              title={p.key.replace(/^meta:/, "")}
              subtitle={p.value}
              actions={<ActionPanel><Action.CopyToClipboard title="Copy" content={`${p.key}: ${p.value}`} /></ActionPanel>}
            />
          ))}
      </List.Section>
      
      <List.Section title="Actions">
        <List.Item
          title="Copy All as JSON"
          subtitle="Copy all filtered results as JSON"
          actions={<ActionPanel><Action.CopyToClipboard title="Copy JSON" content={jsonPretty} /></ActionPanel>}
        />
      </List.Section>
    </List>
  );
}
