const elements = {
  form: document.querySelector("#dashboardSearchForm"),
  input: document.querySelector("#dashboardSymbol"),
  symbolSelect: document.querySelector("#dashboardSymbolSelect"),
  loadButton: document.querySelector("#loadDashboardButton"),
  quickButtons: document.querySelectorAll("[data-dashboard-symbol]"),
  status: document.querySelector("#dashboardStatus"),
  logo: document.querySelector("#companyLogo"),
  exchangeLabel: document.querySelector("#companyExchange"),
  companyName: document.querySelector("#companyName"),
  companyMeta: document.querySelector("#companyMeta"),
  tradeState: document.querySelector("#tradeState"),
  summary: document.querySelector("#companySummary"),
  website: document.querySelector("#companyWebsite"),
  priceSymbol: document.querySelector("#priceSymbol"),
  price: document.querySelector("#dashboardPrice"),
  currency: document.querySelector("#dashboardCurrency"),
  change: document.querySelector("#dashboardChange"),
  updatedAt: document.querySelector("#dashboardUpdatedAt"),
  marketCap: document.querySelector("#marketCap"),
  sector: document.querySelector("#sector"),
  industry: document.querySelector("#industry"),
  exchange: document.querySelector("#exchange"),
  ceo: document.querySelector("#ceo"),
  employees: document.querySelector("#employees"),
  range: document.querySelector("#range"),
  country: document.querySelector("#country"),
  chartSummary: document.querySelector("#chartSummary"),
  chart: document.querySelector("#dashboardChart"),
  recentPriceSummary: document.querySelector("#recentPriceSummary"),
  priceRows: document.querySelector("#priceRows")
};

const API_BASE_URL =
  typeof window.API_BASE_URL === "string" ? window.API_BASE_URL : "";
const money = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2
});
const integer = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const STOCK_SYMBOLS = [
  "AAPL",
  "TSLA",
  "AMZN",
  "MSFT",
  "NVDA",
  "GOOGL",
  "META",
  "NFLX",
  "JPM",
  "V",
  "BAC",
  "PYPL",
  "DIS",
  "T",
  "PFE",
  "COST",
  "INTC",
  "KO",
  "TGT",
  "NKE",
  "SPY",
  "BA",
  "BABA",
  "XOM",
  "WMT",
  "GE",
  "CSCO",
  "VZ",
  "JNJ",
  "CVX",
  "PLTR",
  "SQ",
  "SHOP",
  "SBUX",
  "SOFI",
  "HOOD",
  "RBLX",
  "SNAP",
  "AMD",
  "UBER",
  "FDX",
  "ABBV",
  "ETSY",
  "MRNA",
  "LMT",
  "GM",
  "F",
  "LCID",
  "CCL",
  "DAL",
  "UAL",
  "AAL",
  "TSM",
  "SONY",
  "ET",
  "MRO",
  "COIN",
  "RIVN",
  "RIOT",
  "CPRX",
  "VWO",
  "SPYG",
  "NOK",
  "ROKU",
  "VIAC",
  "ATVI",
  "BIDU",
  "DOCU",
  "ZM",
  "PINS",
  "TLRY",
  "WBA",
  "MGM",
  "NIO",
  "C",
  "GS",
  "WFC",
  "ADBE",
  "PEP",
  "UNH",
  "CARR",
  "HCA",
  "TWTR",
  "BILI",
  "SIRI",
  "FUBO",
  "RKT"
];

let activeSymbol = "AAPL";
let latestPrices = [];
let requestId = 0;
const RECENT_PRICE_DAYS = 14;
const CANDLESTICK_DAYS = 14;
let chartState = {
  candleSlot: 0,
  points: [],
  padding: null,
  symbol: "",
  width: 0
};

function normalizeSymbol(value) {
  return String(value || "AAPL").trim().toUpperCase();
}

function text(value, fallback = "--") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value) {
  const parsed = toFiniteNumber(value);
  return parsed === null ? "--" : money.format(parsed);
}

function formatCompact(value) {
  const parsed = toFiniteNumber(value);
  return parsed === null ? "--" : compactNumber.format(parsed);
}

function formatInteger(value) {
  const parsed = toFiniteNumber(value);
  return parsed === null ? "--" : integer.format(parsed);
}

function formatPercent(value) {
  const parsed = toFiniteNumber(value);
  return parsed !== null
    ? `${parsed >= 0 ? "+" : ""}${parsed.toFixed(2)}%`
    : "--";
}

function formatSignedMoney(value) {
  const parsed = toFiniteNumber(value);
  return parsed !== null ? `${parsed >= 0 ? "+" : ""}${formatMoney(parsed)}` : "--";
}

function summarizeText(value, maxChars = 340) {
  const source = text(value, "No company profile returned.").replace(/\s+/g, " ").trim();

  if (source.length <= maxChars) {
    return source;
  }

  const sentences = source.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [source];
  let summary = "";

  for (const sentence of sentences) {
    const next = `${summary}${summary ? " " : ""}${sentence.trim()}`;

    if (next.length > maxChars) {
      break;
    }

    summary = next;
  }

  if (summary.length >= 120) {
    return summary;
  }

  const truncated = source.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxChars)}...`;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function setLoading(isLoading) {
  elements.loadButton.disabled = isLoading;
  elements.loadButton.textContent = isLoading ? "Loading" : "Load";
  elements.symbolSelect.disabled = isLoading;
  elements.quickButtons.forEach((button) => {
    button.disabled = isLoading;
  });
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

function getPriceChange(prices) {
  const latest = prices[0];
  const previous = prices[1];

  if (!latest) {
    return { change: null, percent: null };
  }

  if (typeof latest.change === "number" || typeof latest.changePercent === "number") {
    return {
      change: latest.change ?? null,
      percent: latest.changePercent ?? null
    };
  }

  if (typeof latest.close === "number" && typeof previous?.close === "number") {
    const change = latest.close - previous.close;
    const percent = previous.close ? (change / previous.close) * 100 : null;
    return { change, percent };
  }

  return { change: null, percent: null };
}

function setActiveSymbol(symbol) {
  activeSymbol = normalizeSymbol(symbol);
  elements.input.value = activeSymbol;
  elements.symbolSelect.value = STOCK_SYMBOLS.includes(activeSymbol) ? activeSymbol : "";
  elements.quickButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.dashboardSymbol === activeSymbol);
  });
}

function renderSymbolOptions() {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a stock";
  elements.symbolSelect.append(placeholder);

  STOCK_SYMBOLS.forEach((symbol) => {
    const option = document.createElement("option");
    option.value = symbol;
    option.textContent = symbol;
    elements.symbolSelect.append(option);
  });
}

function renderProfile(profile, symbol, fetchedAt) {
  const profileSymbol = profile.symbol || symbol;

  document.title = `${profileSymbol} Stock Dashboard`;
  elements.exchangeLabel.textContent = text(
    profile.exchangeFullName || profile.exchange,
    "Company"
  );
  elements.companyName.textContent = text(profile.companyName || profileSymbol);
  elements.companyMeta.textContent = [profileSymbol, profile.sector, profile.industry]
    .filter(Boolean)
    .join(" / ");
  const hasTradingState = typeof profile.isActivelyTrading === "boolean";
  elements.tradeState.textContent = hasTradingState
    ? profile.isActivelyTrading
      ? "Active"
      : "Inactive"
    : "--";
  elements.tradeState.classList.toggle(
    "inactive",
    hasTradingState && !profile.isActivelyTrading
  );
  elements.summary.textContent = summarizeText(profile.description);

  if (profile.image) {
    elements.logo.src = profile.image;
    elements.logo.hidden = false;
  } else {
    elements.logo.removeAttribute("src");
    elements.logo.hidden = true;
  }

  elements.website.href = profile.website || "#";
  elements.website.hidden = !profile.website;
  elements.priceSymbol.textContent = profileSymbol;
  elements.currency.textContent = profile.currency || "USD";
  elements.marketCap.textContent = formatCompact(profile.marketCap);
  elements.sector.textContent = text(profile.sector);
  elements.industry.textContent = text(profile.industry);
  elements.exchange.textContent = text(profile.exchangeFullName || profile.exchange);
  elements.ceo.textContent = text(profile.ceo);
  elements.employees.textContent = formatInteger(profile.fullTimeEmployees);
  elements.range.textContent = text(profile.range);
  elements.country.textContent = text(profile.country);

  const updatedDate = fetchedAt ? new Date(fetchedAt) : new Date();
  elements.updatedAt.textContent = `Updated ${updatedDate.toLocaleString()}`;
}

function renderPriceCard(profile, prices) {
  const latest = prices[0];
  const latestClose = typeof latest?.close === "number" ? latest.close : profile.price;
  const { change, percent } = getPriceChange(prices);
  const hasChange = typeof change === "number" || typeof percent === "number";
  const isNegative = typeof change === "number" && change < 0;

  elements.price.textContent = formatMoney(latestClose);
  elements.change.textContent = hasChange
    ? `${formatMoney(change)} (${formatPercent(percent)})`
    : "--";
  elements.change.classList.toggle("negative", isNegative);
  elements.change.classList.toggle("positive", !isNegative && hasChange);
}

function createPriceRow(item) {
  const row = document.createElement("div");
  row.className = "price-table-row";

  const changeClass =
    typeof item.change === "number" && item.change < 0 ? "negative" : "positive";
  const change = document.createElement("span");
  change.className = changeClass;
  change.textContent =
    typeof item.change === "number" || typeof item.changePercent === "number"
      ? `${formatMoney(item.change)} (${formatPercent(item.changePercent)})`
      : "--";

  [item.date || "--", formatMoney(item.close)].forEach((value) => {
    const cell = document.createElement("span");
    cell.textContent = value;
    row.append(cell);
  });

  row.append(change);
  return row;
}

function renderPriceRows(prices) {
  elements.priceRows.innerHTML = "";
  const recentPrices = prices.slice(0, RECENT_PRICE_DAYS);
  renderRecentPriceSummary(recentPrices);

  if (!prices.length) {
    const empty = document.createElement("p");
    empty.className = "empty-results";
    empty.textContent = "No historical prices found.";
    elements.priceRows.append(empty);
    return;
  }

  recentPrices.forEach((item) => {
    elements.priceRows.append(createPriceRow(item));
  });
}

function renderRecentPriceSummary(prices) {
  if (!elements.recentPriceSummary) {
    return;
  }

  const latest = prices[0];
  const oldest = prices[prices.length - 1];
  const latestClose = toFiniteNumber(latest?.close);
  const oldestClose = toFiniteNumber(oldest?.close);
  const hasSummary = prices.length > 1 && latestClose !== null && oldestClose !== null;

  if (!hasSummary) {
    elements.recentPriceSummary.textContent = "14D --";
    elements.recentPriceSummary.classList.remove("positive", "negative");
    return;
  }

  const change = latestClose - oldestClose;
  const percent = oldestClose ? (change / oldestClose) * 100 : null;
  const isNegative = change < 0;

  elements.recentPriceSummary.textContent = `14D ${formatSignedMoney(change)} (${formatPercent(percent)})`;
  elements.recentPriceSummary.classList.toggle("negative", isNegative);
  elements.recentPriceSummary.classList.toggle("positive", !isNegative);
}

function getCssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function formatAxisDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || "--").slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function drawTooltip(context, point, x, y, canvasWidth, padding) {
  const rows = [
    formatAxisDate(point.date),
    `Open ${formatMoney(point.open)}`,
    `High ${formatMoney(point.high)}`,
    `Low ${formatMoney(point.low)}`,
    `Close ${formatMoney(point.close)}`
  ];
  const tooltipWidth = 150;
  const tooltipHeight = 102;
  const offset = 14;
  const tooltipX =
    x + offset + tooltipWidth > canvasWidth - padding.right
      ? x - tooltipWidth - offset
      : x + offset;
  const tooltipY = Math.max(padding.top, y - tooltipHeight / 2);

  context.fillStyle = "rgba(23, 32, 24, 0.94)";
  context.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
  context.strokeStyle = "rgba(255, 255, 255, 0.18)";
  context.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
  context.fillStyle = "#ffffff";
  context.font = "900 11px sans-serif";

  rows.forEach((row, index) => {
    context.fillText(row, tooltipX + 12, tooltipY + 20 + index * 18);
  });
}

function getHoverIndex(event) {
  if (!chartState.points.length || !chartState.padding || !chartState.candleSlot) {
    return null;
  }

  const rect = elements.chart.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const { padding, candleSlot, points, width } = chartState;

  if (x < padding.left || x > width - padding.right) {
    return null;
  }

  const index = Math.round((x - padding.left - candleSlot / 2) / candleSlot);
  return Math.min(Math.max(index, 0), points.length - 1);
}

function drawChart(symbol, prices, hoverIndex = null) {
  latestPrices = prices;
  const canvas = elements.chart;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (!width || !height) {
    chartState = { candleSlot: 0, points: [], padding: null, symbol: "", width: 0 };
    return;
  }

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);

  const context = canvas.getContext("2d");
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const points = prices
    .slice(0, CANDLESTICK_DAYS)
    .map((item) => {
      const close = toFiniteNumber(item.close);
      const open = toFiniteNumber(item.open) ?? close;
      const high = toFiniteNumber(item.high) ?? Math.max(open ?? 0, close ?? 0);
      const low = toFiniteNumber(item.low) ?? Math.min(open ?? 0, close ?? 0);

      if (close === null || open === null || high === null || low === null || !item.date) {
        return null;
      }

      return {
        date: item.date,
        open,
        high,
        low,
        close
      };
    })
    .filter(Boolean)
    .reverse();

  if (points.length < 2) {
    chartState = { candleSlot: 0, points: [], padding: null, symbol, width };
    context.fillStyle = getCssColor("--muted");
    context.font = "800 14px sans-serif";
    context.fillText("No candlestick data available.", 18, 32);
    elements.chartSummary.textContent = "No chart data";
    return;
  }

  const values = points.flatMap((item) => [item.high, item.low]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const paddedMin = min - range * 0.08;
  const paddedMax = max + range * 0.08;
  const paddedRange = paddedMax - paddedMin || 1;
  const padding = { top: 44, right: 72, bottom: 104, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const line = getCssColor("--line");
  const green = getCssColor("--green-dark");
  const red = getCssColor("--red");
  const muted = getCssColor("--muted");

  const candleSlot = plotWidth / points.length;
  const candleWidth = Math.min(18, Math.max(5, candleSlot * 0.56));
  const getX = (index) => padding.left + candleSlot * index + candleSlot / 2;
  const getY = (value) => padding.top + ((paddedMax - value) / paddedRange) * plotHeight;
  const selectedIndex =
    Number.isInteger(hoverIndex) && hoverIndex >= 0 && hoverIndex < points.length
      ? hoverIndex
      : null;

  chartState = {
    candleSlot,
    points,
    padding,
    symbol,
    width
  };

  context.strokeStyle = line;
  context.lineWidth = 1;
  context.fillStyle = muted;
  context.font = "700 11px sans-serif";

  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + (plotHeight / 4) * index;
    const value = paddedMax - (paddedRange / 4) * index;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillText(formatMoney(value), 8, y + 4);
  }

  points.forEach((item, index) => {
    const x = getX(index);
    const openY = getY(item.open);
    const closeY = getY(item.close);
    const highY = getY(item.high);
    const lowY = getY(item.low);
    const isUp = item.close >= item.open;
    const color = isUp ? green : red;
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(Math.abs(closeY - openY), 2);

    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(x, highY);
    context.lineTo(x, lowY);
    context.stroke();

    context.fillStyle = color;
    context.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
  });

  const last = points[points.length - 1];
  const selectedPoint = selectedIndex === null ? last : points[selectedIndex];

  const lastX = getX(points.length - 1);
  const lastCloseY = getY(last.close);
  const lastColor = last.close >= last.open ? green : red;

  context.fillStyle = muted;
  context.font = "700 11px sans-serif";
  context.save();
  context.textAlign = "left";
  context.textBaseline = "middle";
  points.forEach((item, index) => {
    const x = getX(index);
    context.save();
    context.translate(x, height - 12);
    context.rotate(-Math.PI / 2);
    context.fillText(formatAxisDate(item.date), 0, 0);
    context.restore();
  });
  context.restore();
  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  context.strokeStyle = lastColor;
  context.fillStyle = lastColor;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(lastX + candleWidth / 2 + 4, lastCloseY);
  context.lineTo(width - padding.right + 6, lastCloseY);
  context.stroke();
  context.fillRect(width - padding.right + 8, lastCloseY - 10, 58, 20);
  context.fillStyle = "#ffffff";
  context.font = "900 11px sans-serif";
  context.textAlign = "center";
  context.fillText(formatMoney(last.close), width - padding.right + 37, lastCloseY + 4);
  context.textAlign = "left";

  if (selectedIndex !== null) {
    const selectedX = getX(selectedIndex);
    const selectedCloseY = getY(selectedPoint.close);
    const selectedOpenY = getY(selectedPoint.open);
    const selectedColor = selectedPoint.close >= selectedPoint.open ? green : red;

    context.strokeStyle = "rgba(23, 32, 24, 0.22)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(selectedX, padding.top);
    context.lineTo(selectedX, height - padding.bottom);
    context.stroke();

    context.strokeStyle = selectedColor;
    context.lineWidth = 2;
    context.strokeRect(
      selectedX - candleWidth / 2 - 3,
      Math.min(selectedOpenY, selectedCloseY) - 3,
      candleWidth + 6,
      Math.max(Math.abs(selectedCloseY - selectedOpenY), 2) + 6
    );
    drawTooltip(context, selectedPoint, selectedX, selectedCloseY, width, padding);
  }

  elements.chartSummary.textContent = "";
}

async function loadDashboard(symbol) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const currentRequestId = requestId + 1;
  requestId = currentRequestId;
  setActiveSymbol(normalizedSymbol);
  setLoading(true);
  setStatus(`Loading ${normalizedSymbol}...`);

  try {
    const profileParams = new URLSearchParams({ symbol: normalizedSymbol });
    const historyParams = new URLSearchParams({
      symbol: normalizedSymbol,
      limit: String(CANDLESTICK_DAYS)
    });
    const [profileData, historyData] = await Promise.all([
      fetchJson(`/api/fmp/profile?${profileParams}`),
      fetchJson(`/api/fmp/historical-price-eod?${historyParams}`)
    ]);

    if (currentRequestId !== requestId) {
      return;
    }

    const profile = profileData.profile || {};
    const prices = historyData.prices || [];
    const resolvedSymbol =
      profileData.resolvedSymbol || historyData.resolvedSymbol || normalizedSymbol;

    setActiveSymbol(resolvedSymbol);
    renderProfile(
      profile,
      resolvedSymbol,
      profileData.fetchedAt || historyData.fetchedAt
    );
    renderPriceCard(profile, prices);
    renderPriceRows(prices);
    drawChart(resolvedSymbol, prices);
    const fallbackSources = [
      profileData.warning ? "profile" : "",
      historyData.warning ? "historical prices" : ""
    ].filter(Boolean);
    const fallbackNote = fallbackSources.length
      ? ` Using fallback data for ${fallbackSources.join(" and ")}.`
      : "";
    setStatus(`Loaded ${profile.companyName || resolvedSymbol}.${fallbackNote}`);
  } catch (error) {
    if (currentRequestId !== requestId) {
      return;
    }

    setStatus(error.message || "Unable to load dashboard right now.");
    elements.priceRows.innerHTML = "";
    renderRecentPriceSummary([]);
    drawChart(normalizedSymbol, []);
  } finally {
    if (currentRequestId === requestId) {
      setLoading(false);
    }
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadDashboard(elements.input.value);
});

elements.quickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveSymbol(button.dataset.dashboardSymbol);
    setStatus(`Ready to load ${activeSymbol}. Click Load to fetch data.`);
  });
});

elements.symbolSelect.addEventListener("change", () => {
  if (!elements.symbolSelect.value) {
    return;
  }

  setActiveSymbol(elements.symbolSelect.value);
  setStatus(`Ready to load ${activeSymbol}. Click Load to fetch data.`);
});

elements.chart.addEventListener("mousemove", (event) => {
  const hoverIndex = getHoverIndex(event);
  const chartSymbol = chartState.symbol || activeSymbol;

  if (hoverIndex === null) {
    drawChart(chartSymbol, latestPrices);
    return;
  }

  drawChart(chartSymbol, latestPrices, hoverIndex);
});

elements.chart.addEventListener("mouseleave", () => {
  drawChart(chartState.symbol || activeSymbol, latestPrices);
});

window.addEventListener("resize", () => {
  drawChart(chartState.symbol || activeSymbol, latestPrices);
});

const initialSymbol = new URLSearchParams(window.location.search).get("symbol");
renderSymbolOptions();
setActiveSymbol(initialSymbol || elements.input.value);
setStatus(`Ready to load ${activeSymbol}. Click Load to fetch data.`);
