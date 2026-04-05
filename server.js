const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// ── helper: read request body ──────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// ── helper: call Anthropic API ────────────────────────────────────
function callAnthropic(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── HTTP server ────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API proxy endpoint ──────────────────────────────────────────
  if (req.method === 'POST' && parsed.pathname === '/api/analyse') {
    try {
      const rawBody = await readBody(req);
      const { stock, horizon, apiKey } = JSON.parse(rawBody);

      if (!apiKey || !stock) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing stock or apiKey' }));
        return;
      }

      const systemPrompt = `You are an expert Indian stock fundamental analyst. You have web search capability. Use it to fetch LIVE, current data for every metric before generating output.

RULES:
- Never fabricate numbers. Use web search. If unavailable, write: DATA UNAVAILABLE
- No buy/sell/target price recommendations. Provide a VIEW only.
- Cite sources for every metric.
- All projections are scenario-based on historical CAGR only — not predictions.

OUTPUT: Return ONLY a raw HTML string. No markdown. No code fences. No explanation.
Start directly with <div class="conf ...">

The HTML must use these CSS classes (already loaded in the page):
.conf.high/.moderate/.low/.vlow | .tab-row | .tab-btn | .tab-btn.active | .panel | .panel.on
.card | .card.green/.amber/.red/.blue/.grey | .view-label.green/.amber/.red | .view-reason
.sec-label | .bullet-row | .bicon | .badge.ok/.warn/.bad/.info/.neu
.mgrid | .mc (.ml .mv .ms) | .info-row (.il .iv) | .score-box
.eps-row | .eps-chip (.eps-q .eps-v .eps-y) | .peer-you
.flag-card (.flag-title .flag-note) | .pos | .neg | .disc

TAB STRUCTURE (8 tabs, Tab 7 = View is default active):
Tab 0 Snapshot | Tab 1 Valuation | Tab 2 Growth | Tab 3 Health | Tab 4 Returns | Tab 5 Peers | Tab 6 Ownership | Tab 7 View

Tab 7 panel → class="panel on" | Tab 7 button → class="tab-btn active"
All other panels → class="panel" | All other buttons → class="tab-btn"

TAB 0 SNAPSHOT: Company full name, NSE ticker, sector, industry, business description (2 lines), moat (1 line). Metric grid: CMP, 52W High, 52W Low, Market Cap, Face Value. Any flags (pledging>10%, high debt, negative FCF etc) in .flag-card blocks.

TAB 1 VALUATION: Table — P/E, P/B, EV/EBITDA: Current / Sector avg / Stock 5Y avg / Signal (.badge.ok=CHEAP .badge.warn=FAIR .badge.bad=EXPENSIVE) / Plain English. Score box: UNDERVALUED / FAIRLY VALUED / OVERVALUED / MIXED + 1-line reason.

TAB 2 GROWTH: Table — Revenue, Net Profit, EPS, EBITDA margin, Net profit margin: 3Y CAGR / 5Y CAGR / Trend emoji / Source. EPS last 8 quarters as .eps-chip cards with YoY % in .pos/.neg. Score box: ACCELERATING / STEADY / SLOWING / DECLINING + 1-line reason.

TAB 3 HEALTH: Table — D/E, Interest Coverage, Current Ratio, FCF: Value / 5Y Trend / Signal / Plain English. Forward projections table for the investment horizon: Bear/Base/Bull with Est. Revenue / Net Profit / EPS. Score box: health classification + 1-line.

TAB 4 RETURNS: Table — ROE, ROCE, Dividend Yield, Dividend Payout: Current / 3Y avg / 5Y avg / Signal. Dividend history highlights table. Score box: return quality classification + 1-line.

TAB 5 PEERS: Peer comparison table (stock + 3 peers): Company / P/E / P/B / ROE / Rev Growth / D/E / Edge. Top 5 recent news items (headline + why it matters + date + source). Score box: LEADING / MID-PACK / LAGGING + 1-line.

TAB 6 OWNERSHIP: Shareholding table: Promoter / FII / DII / Promoter Pledging: Latest % / 8Q Trend / Signal / Meaning. Earnings call table: What management said / What it means. Management tone. Score box: ownership signal + 1-line.

TAB 7 VIEW (default active): .card.green/.amber/.red based on quality. .view-label, .view-reason. 3 strengths (✓). 2 watch points (⚠). 1 track item (→). Two-column grid: .card.green Opportunities (3 items) + .card.red Risks (3 items). Italic disclaimer.

End with <details> glossary (P/E, P/B, EV/EBITDA, ROE, ROCE, FCF, CAGR, TCV, Promoter pledging) and .disc legal disclaimer.

Then end with this exact script tag:
<script>function show(n){var p=document.querySelectorAll('.panel');var t=document.querySelectorAll('.tab-btn');for(var i=0;i<p.length;i++){p[i].className='panel'+(i===n?' on':'');t[i].className='tab-btn'+(i===n?' active':'');}}</script>`;

      const payload = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Analyse the Indian stock "${stock}" for a ${horizon} investment horizon. Use web search extensively for live data. Return ONLY the raw HTML report — nothing else.`
        }]
      };

      const result = await callAnthropic(apiKey, payload);

      if (result.status !== 200) {
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: result.body?.error?.message || 'API error' }));
        return;
      }

      // Extract text content from response
      const html = (result.body.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
        .replace(/^```html?\n?/i, '')
        .replace(/```$/, '')
        .trim();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ html }));

    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── Serve static files ─────────────────────────────────────────
  let filePath = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  filePath = path.join(__dirname, 'public', filePath);

  const extMap = {
    '.html': 'text/html', '.css': 'text/css',
    '.js': 'application/javascript', '.json': 'application/json'
  };
  const ext = path.extname(filePath);
  const contentType = extMap[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅  Indian Stock Analyser running at http://localhost:${PORT}\n`);
});
