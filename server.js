const http = require("http");
const { URL } = require("url");

const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const FMP_BASE_URL = "https://financialmodelingprep.com/stable";
const FMP_API_KEY =
  // process.env.FMP_API_KEY || "wPOEwRqoaaZyzPAki35kFardmdhBA3Hm";
  process.env.FMP_API_KEY || "5JOoAjXFbNxbNUA7gVe0ntQacwjtxRg3";

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...getCorsHeaders()
  });
  res.end(JSON.stringify(payload));
}

function getSingleQueryParam(parsedUrl, key) {
  const value = parsedUrl.searchParams.get(key);
  return value ? value.trim() : "";
}

function getFmpResults(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.value)) {
    return data.value;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.historical)) {
    return data.historical;
  }

  return [];
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeHistoricalPrices(results) {
  return results.map((item) => ({
    ...item,
    open: toNumberOrNull(item.open),
    high: toNumberOrNull(item.high),
    low: toNumberOrNull(item.low),
    close: toNumberOrNull(item.close),
    adjClose: toNumberOrNull(item.adjClose),
    volume: toNumberOrNull(item.volume),
    change: toNumberOrNull(item.change),
    changePercent: toNumberOrNull(item.changePercent)
  }));
}

async function getFmpProfile(req, res, parsedUrl) {
  const rawSymbol = getSingleQueryParam(parsedUrl, "symbol");

  if (!rawSymbol) {
    sendJson(res, 400, { error: "Missing required query parameter: symbol" });
    return;
  }

  const requestedSymbol = rawSymbol.toUpperCase();
  let symbol = requestedSymbol;

  try {
    let results = await fetchFmpProfileResults(symbol);
    let profile = results[0] || null;

    if (!profile) {
      const resolvedSymbol = await findFirstFmpSymbol(rawSymbol);

      if (resolvedSymbol && resolvedSymbol.toUpperCase() !== symbol) {
        symbol = resolvedSymbol.toUpperCase();
        results = await fetchFmpProfileResults(symbol);
        profile = results[0] || null;
      }
    }

    if (!profile) {
      sendJson(res, 404, {
        error: `No profile found for ${requestedSymbol}`,
        symbol: requestedSymbol,
        resolvedSymbol: symbol,
        count: 0,
        results: []
      });
      return;
    }

    sendJson(res, 200, {
      symbol,
      query: rawSymbol,
      resolvedSymbol: symbol,
      count: results.length,
      profile,
      results,
      source: "Financial Modeling Prep profile",
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    try {
      const profile = await fetchYahooProfile(symbol);
      symbol = profile.symbol?.toUpperCase() || symbol;

      sendJson(res, 200, {
        symbol,
        query: rawSymbol,
        resolvedSymbol: symbol,
        count: 1,
        profile,
        results: [profile],
        source: "Yahoo Finance search/chart fallback",
        warning:
          "Could not fetch company profile data from Financial Modeling Prep. Showing Yahoo Finance fallback data.",
        fetchedAt: new Date().toISOString()
      });
    } catch (fallbackError) {
      sendJson(res, 502, {
        error: "Could not fetch company profile data from Financial Modeling Prep"
      });
    }
  }
}

async function fetchFmpJson(fmpUrl) {
  const response = await fetch(fmpUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "sp500-stock-dashboard/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`FMP request failed with ${response.status}`);
  }

  return response.json();
}

async function fetchFmpSearchResults(query, endpoint = "search-symbol") {
  const fmpUrl = new URL(`${FMP_BASE_URL}/${endpoint}`);
  fmpUrl.searchParams.set("query", query);
  fmpUrl.searchParams.set("apikey", FMP_API_KEY);

  const data = await fetchFmpJson(fmpUrl);
  return getFmpResults(data);
}

async function findFirstFmpSymbol(query) {
  let results = await fetchFmpSearchResults(query, "search-symbol");

  if (!results.length) {
    results = await fetchFmpSearchResults(query, "search-name");
  }

  return results[0]?.symbol || "";
}

async function fetchFmpProfileResults(symbol) {
  const fmpUrl = new URL(`${FMP_BASE_URL}/profile`);
  fmpUrl.searchParams.set("symbol", symbol);
  fmpUrl.searchParams.set("apikey", FMP_API_KEY);

  const data = await fetchFmpJson(fmpUrl);
  return getFmpResults(data);
}

async function fetchYahooSearchQuote(symbol) {
  const url = new URL("https://query2.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", symbol);
  url.searchParams.set("quotesCount", "1");
  url.searchParams.set("newsCount", "0");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 stock-dashboard/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Yahoo search request failed with ${response.status}`);
  }

  const data = await response.json();
  return data?.quotes?.find(
    (quote) => quote.symbol?.toUpperCase() === symbol.toUpperCase()
  ) || data?.quotes?.[0] || null;
}

async function fetchYahooChartMeta(symbol) {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set("range", "1d");
  url.searchParams.set("interval", "1d");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 stock-dashboard/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Yahoo chart request failed with ${response.status}`);
  }

  const data = await response.json();
  return data?.chart?.result?.[0]?.meta || null;
}

async function fetchYahooProfile(symbol) {
  const [searchResult, chartResult] = await Promise.allSettled([
    fetchYahooSearchQuote(symbol),
    fetchYahooChartMeta(symbol)
  ]);
  const searchQuote =
    searchResult.status === "fulfilled" ? searchResult.value : null;
  const chartMeta = chartResult.status === "fulfilled" ? chartResult.value : null;

  if (!searchQuote && !chartMeta) {
    throw new Error(`No Yahoo profile data found for ${symbol}`);
  }

  const resolvedSymbol = searchQuote?.symbol || chartMeta?.symbol || symbol;
  const companyName =
    searchQuote?.longname ||
    searchQuote?.shortname ||
    chartMeta?.longName ||
    resolvedSymbol;
  const exchange = searchQuote?.exchDisp || chartMeta?.exchangeName || "";
  const exchangeFullName =
    searchQuote?.exchange ||
    chartMeta?.fullExchangeName ||
    chartMeta?.exchangeName ||
    exchange;

  return {
    symbol: resolvedSymbol,
    companyName,
    currency: chartMeta?.currency || "USD",
    price: toNumberOrNull(chartMeta?.regularMarketPrice),
    marketCap: null,
    beta: null,
    volAvg: null,
    lastDiv: null,
    range: null,
    changes: null,
    exchange,
    exchangeShortName: exchange,
    exchangeFullName,
    industry: searchQuote?.industryDisp || searchQuote?.industry || "",
    sector: searchQuote?.sectorDisp || searchQuote?.sector || "",
    country: "",
    isActivelyTrading: true,
    isAdr: false,
    image: "",
    website: "",
    description:
      `${companyName} profile data is temporarily limited because Financial Modeling Prep is unavailable right now.`,
    ceo: "",
    fullTimeEmployees: null,
    ipoDate: ""
  };
}

async function fetchFmpHistoricalResults(symbol) {
  const fmpUrl = new URL(`${FMP_BASE_URL}/historical-price-eod/full`);
  fmpUrl.searchParams.set("symbol", symbol);
  fmpUrl.searchParams.set("apikey", FMP_API_KEY);

  const data = await fetchFmpJson(fmpUrl);
  return getFmpResults(data);
}

async function fetchYahooHistoricalPrices(symbol, limit) {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set("range", "6mo");
  url.searchParams.set("interval", "1d");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "history");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 stock-dashboard/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Yahoo historical request failed with ${response.status}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};

  return timestamps
    .map((timestamp, index) => {
      const open = toNumberOrNull(quote.open?.[index]);
      const high = toNumberOrNull(quote.high?.[index]);
      const low = toNumberOrNull(quote.low?.[index]);
      const close = toNumberOrNull(quote.close?.[index]);
      const volume = toNumberOrNull(quote.volume?.[index]);

      if (close === null) {
        return null;
      }

      return {
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        open,
        high,
        low,
        close,
        volume,
        change: null,
        changePercent: null
      };
    })
    .filter(Boolean)
    .reverse()
    .slice(0, limit)
    .map((item, index, prices) => {
      const previous = prices[index + 1];

      if (previous?.close) {
        const change = item.close - previous.close;
        return {
          ...item,
          change,
          changePercent: (change / previous.close) * 100
        };
      }

      return item;
    });
}

async function getFmpHistoricalPrices(req, res, parsedUrl) {
  const rawSymbol = getSingleQueryParam(parsedUrl, "symbol");
  const rawLimit = getSingleQueryParam(parsedUrl, "limit");

  if (!rawSymbol) {
    sendJson(res, 400, { error: "Missing required query parameter: symbol" });
    return;
  }

  const requestedSymbol = rawSymbol.toUpperCase();
  let symbol = requestedSymbol;
  const limit = Number(rawLimit || 20);
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;

  try {
    let results = await fetchFmpHistoricalResults(symbol);

    if (!results.length) {
      const resolvedSymbol = await findFirstFmpSymbol(rawSymbol);

      if (resolvedSymbol && resolvedSymbol.toUpperCase() !== symbol) {
        symbol = resolvedSymbol.toUpperCase();
        results = await fetchFmpHistoricalResults(symbol);
      }
    }

    const prices = normalizeHistoricalPrices(results).slice(0, safeLimit);

    if (!prices.length) {
      sendJson(res, 404, {
        error: `No historical prices found for ${requestedSymbol}`,
        symbol: requestedSymbol,
        resolvedSymbol: symbol,
        count: 0,
        prices: [],
        results: []
      });
      return;
    }

    sendJson(res, 200, {
      symbol,
      query: rawSymbol,
      resolvedSymbol: symbol,
      count: results.length,
      limit: safeLimit,
      prices,
      results: prices,
      source: "Financial Modeling Prep historical-price-eod full",
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    try {
      const prices = await fetchYahooHistoricalPrices(symbol, safeLimit);

      if (!prices.length) {
        throw new Error(`No Yahoo historical prices found for ${symbol}`);
      }

      sendJson(res, 200, {
        symbol,
        query: rawSymbol,
        resolvedSymbol: symbol,
        count: prices.length,
        limit: safeLimit,
        prices,
        results: prices,
        source: "Yahoo Finance chart fallback",
        warning:
          "Could not fetch historical price data from Financial Modeling Prep. Showing Yahoo Finance fallback data.",
        fetchedAt: new Date().toISOString()
      });
    } catch (fallbackError) {
      sendJson(res, 502, {
        error: "Could not fetch historical price data from Financial Modeling Prep"
      });
    }
  }
}

const server = http.createServer((req, res) => {
  const startedAt = Date.now();
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  res.on("finish", () => {
    console.log(
      `[backend] ${req.method} ${parsedUrl.pathname}${parsedUrl.search} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
    );
  });

  if (req.method === "OPTIONS") {
    res.writeHead(204, getCorsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET" && parsedUrl.pathname === "/api/fmp/profile") {
    getFmpProfile(req, res, parsedUrl);
    return;
  }

  if (
    req.method === "GET" &&
    parsedUrl.pathname === "/api/fmp/historical-price-eod"
  ) {
    getFmpHistoricalPrices(req, res, parsedUrl);
    return;
  }

  if (!parsedUrl.pathname.startsWith("/api/")) {
    sendJson(res, 404, {
      error: "Backend server only handles API routes",
      frontend: "http://localhost:3000"
    });
    return;
  }

  sendJson(res, 404, { error: "API route not found" });
});

server.listen(PORT, () => {
  console.log(`Backend API running at http://localhost:${PORT}`);
  console.log(`Frontend should run separately at http://localhost:3000`);
});
