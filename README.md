# Indian Stock Fundamental Analyser

A full-stack web app for Indian stock fundamental analysis, powered by Claude AI with live web search.

---

## Setup (takes 2 minutes)

### Requirements
- Node.js installed (https://nodejs.org — download the LTS version)
- An Anthropic API key (https://console.anthropic.com)

### Steps

1. **Download and unzip** the folder (indian-stock-analyser)

2. **Open a terminal** inside the folder:
   - Windows: Right-click the folder → "Open in Terminal" (or Command Prompt)
   - Mac: Right-click the folder → "New Terminal at Folder"

3. **Start the server** by running:
   ```
   node server.js
   ```

4. **Open your browser** and go to:
   ```
   http://localhost:3000
   ```

5. **Enter your Anthropic API key** in the field shown (it's saved in your browser for convenience)

6. **Type any Indian stock** name or NSE ticker, pick a horizon, and click Analyse!

---

## Usage

- Works with any NSE-listed stock: TCS, RELIANCE, HDFCBANK, INFY, WIPRO, BAJFINANCE, ICICIBANK, etc.
- Uses live web search on every analysis — data is always fresh
- Your API key is saved locally in the browser (never sent anywhere except Anthropic)
- Each analysis costs approximately $0.05–0.15 in API credits depending on the stock

## Supported horizons
3 Years · 5 Years · 10 Years · 15 Years

## Report tabs
Snapshot · Valuation · Growth · Health · Returns · Peers · Ownership · View (default)

---

## Troubleshooting

**"node is not recognized"** → Install Node.js from https://nodejs.org then restart terminal

**"EADDRINUSE port 3000"** → Another app is using port 3000. Edit server.js line 4, change `PORT = 3000` to `PORT = 3001`, then open http://localhost:3001

**"Invalid API key"** → Double-check your key at https://console.anthropic.com/settings/keys

**Analysis returns error** → Check you have credits at https://console.anthropic.com/settings/billing

---

## Privacy
- Your API key is stored only in your own browser's localStorage
- No data is ever sent to any third-party server — only directly to api.anthropic.com via the local proxy

---

*Not investment advice. For educational and research purposes only.*
