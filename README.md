# Rider Calc · PedidosYa GT

A comprehensive earnings calculator and tracker for PedidosYa delivery riders in Guatemala. Built as a Progressive Web App (PWA) deployable on Netlify, installable as a home screen app on Android and iOS — and convertible to a signed APK via [PWABuilder](https://www.pwabuilder.com).

## Features

- **Earnings calculator** — computes delivery pay based on km to pickup, km to drop-off, multiplier, rain bonus, and number of drop-off points
- **Daily history** — view and edit past deliveries, navigate day by day
- **Stats dashboard** — earnings by time slot, best/worst orders, restaurant wait times, dead time analysis
- **Charts** — 14-day bar charts for earnings, orders, average time, net vs gross
- **Auto-multiplier** — schedule-based automatic multiplier changes by time of day
- **Net earnings tracking** — configurable fuel cost, maintenance, and other daily expenses
- **Personal record** — tracks your best earnings day
- **Week comparison** — current vs previous week side-by-side
- **Odometer tracking** — compare app-reported km vs real km to spot "bonus" km
- **Backup/restore** — export all data as JSON, import on a new device
- **PWA / APK ready** — installable directly from Chrome, or packaged as APK via PWABuilder

## Key Technologies

- [TanStack Start](https://tanstack.com/start) — SSR React framework
- [Tailwind CSS v4](https://tailwindcss.com) — utility CSS
- Vanilla JS app logic (DOM manipulation) mounted after React hydration
- PWA: `manifest.json` + service worker for offline support
- Netlify for hosting and edge delivery

## Running Locally

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Sharing as APK

1. Deploy to Netlify (done automatically via CI)
2. Visit [pwabuilder.com](https://www.pwabuilder.com) and enter the deployed URL
3. Click **Package for stores** → **Android** → download APK
4. Share the APK file via WhatsApp, Drive, or direct link for sideloading

Alternatively, on any Android device: open Chrome → visit the deployed URL → tap ⋮ menu → **Add to Home screen**. This installs the PWA without needing an APK.
