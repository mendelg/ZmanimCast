# Hebrew Date & Zmanim – Raycast Extension

▶ Quick start
  1) Install Raycast CLI: https://www.raycast.com/developers
  2) Clone this folder and run `npm install`
  3) `npm run dev` to develop locally.

Commands
- Gregorian → Hebrew (with optional after-sunset shift)
- Hebrew → Gregorian (English or gematriya)
- Today in Hebrew (menu bar)
- Kosher Zmanim (fuzzy search across all zman names)

Zmanim uses `kosher-zmanim` (TS port of KosherJava). Provide date, lat/lon, tz, and optional elevation. Enable "Complex Zmanim" for expanded opinions. Times are formatted in your locale; raw ISO strings are shown too.