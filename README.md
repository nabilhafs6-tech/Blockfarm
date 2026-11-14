# 🌾 Blockfarm

**The open-source DeFi yield-farming toolkit** — track live yield pools across every chain,
simulate compound APY growth, and measure impermanent loss before you ape in.

![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Dependencies: none](https://img.shields.io/badge/dependencies-zero-brightgreen)
![Data: DefiLlama](https://img.shields.io/badge/data-DefiLlama-blue)

## ✨ Features

- 🌾 **Live Pool Explorer** — thousands of real yield pools from the
  [DefiLlama Yields API](https://yields.llama.fi/pools). Search, filter by chain / TVL /
  stablecoins, sort by APY or TVL, and load more as you scroll.
- 📈 **Compound APY Simulator** — compare daily vs. weekly vs. monthly vs. no compounding
  with an auto-generated growth chart. Hit **Simulate** on any pool to auto-fill its live APY.
- ⚖️ **Impermanent Loss Calculator** — enter a price move and see exactly what it costs your
  50/50 LP position vs. simply HODLing, complete with the full IL curve and your scenario marker.
- ⭐ **Watchlist** — star pools you like; they're stored in `localStorage` (no account, no tracking).
- 🛡 **Risk badges** — instant Low / Med / Degen heuristic on every pool
  (TVL, APY sanity, stablecoin status, IL risk, 30-day outlook).
- 🌙 **Zero dependencies** — pure HTML/CSS/JS. No build step, no API keys, no backend.
  Works offline with a built-in demo dataset if the API is unreachable.

## 🚀 Quick start

It's a fully static site. Either open `index.html` directly, or serve the folder:

```bash
npx serve .        # or: python3 -m http.server 8080
```

### Deploy

- **Vercel / Netlify / Cloudflare Pages** — import the repo, framework preset: *Other*, no build command.
- **GitHub Pages** — `Settings → Pages → Deploy from branch → main / (root)`.
- **Single file** — open/share `blockfarm-standalone.html` (the whole app inlined into one HTML file).

## 🗂 Project structure

```
Blockfarm/
├── index.html                  # app shell
├── assets/
│   ├── css/style.css           # dark farm-terminal theme
│   ├── js/app.js               # data, charts, calculators
│   └── favicon.svg             # sprout-on-blocks logo
├── blockfarm-standalone.html   # same app, one file (dist)
├── push-to-github.sh           # helper: create repo + push
├── LICENSE                     # MIT
└── README.md
```

## 📊 Data source

Pool data comes from **DefiLlama** (`https://yields.llama.fi/pools`) — free, public, no key required.
Fields used: chain, project, symbol, TVL, APY (base + reward), stablecoin flag, IL risk, 30-day prediction.

## ⚠️ Disclaimer

Blockfarm is an **educational tool, not financial advice**. Displayed APYs are variable and often paid in
volatile reward tokens; smart contracts can be exploited; impermanent loss is real. Always **DYOR**
before deploying capital.

## 🇮🇩 Versi singkat (Bahasa Indonesia)

**Blockfarm** = toolkit farming DeFi gratis dan open-source:
pantau ribuan pool yield live (data DefiLlama), simulasikan bunga majemuk (APY compounding),
hitung impermanent loss, dan simpan pool favorit di watchlist lokal.
Tinggal buka — tanpa install, tanpa API key, tanpa backend.

Cara jalanin: buka `index.html`, atau `npx serve .`, lalu deploy ke Vercel/GitHub Pages kalau mau online.

## 📄 License

MIT © 2026 Blockfarm contributors. Farm responsibly. 🧑‍🌾
