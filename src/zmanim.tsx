import { Action, ActionPanel, Detail, Form, Icon, List, Toast, showToast, useNavigation, LocalStorage } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { getZmanimJson } from "kosher-zmanim";
import tzLookup from "tz-lookup";

// No presets anymore; users can search address or enter coordinates directly.

type Options = {
  date: Date;
  locationName?: string;
  latitude: number;
  longitude: number;
  timeZoneId: string;
  elevation?: number;
  complexZmanim?: boolean;
};

export default function ZmanimCommand() {
  const { push } = useNavigation();
  const [date, setDate] = useState<Date>(new Date());
  const [locationName, setLocationName] = useState<string>("Lakewood");
  const [lat, setLat] = useState<string>("40.0821");
  const [lon, setLon] = useState<string>("-74.2097");
  const [tz, setTz] = useState<string>("America/New_York");
  const [elev, setElev] = useState<string>("0");
  const [complex, setComplex] = useState<boolean>(true);
  const [addrQuery, setAddrQuery] = useState<string>("");
  const [addrResults, setAddrResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Load last used custom location (if any) on start
  useEffect(() => {
    (async () => {
      try {
        const stored = await LocalStorage.getItem<string>("zmanim:lastLocation");
        if (stored) {
          const parsed = JSON.parse(stored) as { locationName: string; lat: number; lon: number; tz: string; elev?: number };
          if (parsed && typeof parsed.lat === "number" && typeof parsed.lon === "number" && parsed.tz) {
            setLocationName(parsed.locationName || "Custom Location");
            setLat(String(parsed.lat));
            setLon(String(parsed.lon));
            setTz(parsed.tz);
            if (parsed.elev != null) setElev(String(parsed.elev));
            // Loaded a saved custom location
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Persist whenever core fields change
  useEffect(() => {
    const payload = {
      locationName,
      lat: Number(lat),
      lon: Number(lon),
      tz,
      elev: Number(elev) || 0,
    };
    LocalStorage.setItem("zmanim:lastLocation", JSON.stringify(payload));
  }, [locationName, lat, lon, tz, elev]);

  // Geocode address using public Nominatim API (no key). Debounced on addrQuery.
  useEffect(() => {
    const q = addrQuery.trim();
    if (!q) {
      setAddrResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=0&q=${encodeURIComponent(q)}`;
        const resp = await fetch(url, { signal: controller.signal, headers: { "Accept-Language": "en", "User-Agent": "raycast-hebrew-zmanim/0.2" } });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
        const data = (await resp.json()) as Array<{ display_name: string; lat: string; lon: string }>;
        if (!cancelled) setAddrResults(data);
      } catch (e) {
        if (!cancelled) setAddrResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 400);
    return () => { cancelled = true; controller.abort(); clearTimeout(t); };
  }, [addrQuery]);

  async function compute() {
    try {
      const options: Options = {
        date,
        locationName,
        latitude: Number(lat),
        longitude: Number(lon),
        elevation: elev ? Number(elev) : 0,
        timeZoneId: tz,
        complexZmanim: complex,
      };
      const data = await getZmanimJson(options as any);
      push(<ZmanimResult data={data} />);
    } catch (e: any) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to compute zmanim", message: String(e?.message || e) });
    }
  }

  return (
    <Form
      actions={<ActionPanel><Action.SubmitForm title="Calculate Zmanim" onSubmit={compute} icon={Icon.Calculator} /></ActionPanel>}
    >
      <Form.Description text="Type an address to geocode or enter coordinates below." />
      <Form.TextField id="address" title="Search Address" placeholder="e.g., Brooklyn, NY 11225" value={addrQuery} onChange={setAddrQuery} />
      {!!addrResults.length && (
        <Form.Dropdown id="addressResults" title={isSearching ? "Matching Addresses (searching…)" : "Matching Addresses"} storeValue={false} onChange={(val) => {
          const [lt, ln, name] = val.split("|");
          setLat(lt);
          setLon(ln);
          setLocationName(name);
          try { setTz(tzLookup(Number(lt), Number(ln))); } catch {}
        }}>
          {addrResults.map((r, i) => (
            <Form.Dropdown.Item key={`${r.lat},${r.lon}-${i}`} value={`${r.lat}|${r.lon}|${r.display_name}`} title={r.display_name} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField id="locationName" title="Location Name" value={locationName} onChange={setLocationName} />
      <Form.TextField id="latitude" title="Latitude" value={lat} onChange={setLat} />
      <Form.TextField id="longitude" title="Longitude" value={lon} onChange={setLon} />
      <Form.TextField id="timeZoneId" title="Time Zone ID" placeholder="e.g., America/New_York" value={tz} onChange={setTz} />
      <Form.TextField id="elevation" title="Elevation (meters, optional)" value={elev} onChange={setElev} />
      <Form.Checkbox id="complex" label="Complex Zmanim (more opinions)" value={complex} onChange={setComplex} />
      <Form.DatePicker id="date" title="Date" value={date} onChange={(d) => d && setDate(d)} />
      <Form.Description text="Tip: After selecting an address, you can tweak fields. Results list has fuzzy search (try 'misheyakir', 'plag', 'tzais')." />
    </Form>
  );
}

function ZmanimResult({ data }: { data: any }) {
  const allPairs = useMemo(() => {
    const entries: { key: string; value: string }[] = [];
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
    return entries;
  }, [data]);

  const fuse = useMemo(() => new Fuse(allPairs, { includeScore: true, threshold: 0.4, keys: ["key", "value"] }), [allPairs]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return allPairs;
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse, allPairs]);

  function formatLocal(s: string) {
    // s may be ISO like 2025-08-31T19:29:29-04:00 or "N/A"
    if (!s || s === "N/A") return s;
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(d);
  }

  const jsonPretty = useMemo(() => JSON.stringify(data, null, 2), [data]);

  return (
    <List searchBarPlaceholder="Search zmanim… (e.g., misheyakir, plag, tzais)" onSearchTextChange={setQuery} searchText={query} throttle>
      <List.Section title="Zmanim">
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
          title="Copy full JSON"
          icon={Icon.Clipboard}
          actions={<ActionPanel><Action.CopyToClipboard title="Copy JSON" content={jsonPretty} /></ActionPanel>}
        />
      </List.Section>
    </List>
  );
}
