export const MOBILE_DASHBOARD_HTML = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0b1020">
  <title>雪山隧道即時車況</title>
  <style>
    :root { color-scheme: dark; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Noto Sans TC", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #0b1020; color: #f7f8fb; }
    main { width: min(100%, 620px); margin: 0 auto; padding: max(24px, env(safe-area-inset-top)) 18px max(28px, env(safe-area-inset-bottom)); }
    h1 { margin: 0 0 4px; font-size: 28px; letter-spacing: -0.03em; }
    .subtitle { margin: 0 0 22px; color: #aeb6c7; font-size: 14px; }
    .status { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px; color: #aeb6c7; font-size: 13px; }
    .grid { display: grid; gap: 14px; }
    .card { border: 1px solid #27304a; border-radius: 18px; background: #141b2e; padding: 18px; box-shadow: 0 10px 28px rgba(0,0,0,.18); }
    .card h2 { margin: 0 0 15px; font-size: 21px; }
    .lanes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .lane { border: 1px solid transparent; border-radius: 14px; background: #0f1525; padding: 14px; transition: border-color .18s ease, background .18s ease, box-shadow .18s ease; }
    .lane-label { color: #aeb6c7; font-size: 13px; }
    .speed { margin-top: 6px; font-size: 31px; font-weight: 750; letter-spacing: -0.04em; }
    .unit { margin-left: 4px; color: #aeb6c7; font-size: 13px; font-weight: 500; }
    .recommendation { margin-top: 15px; border: 1px solid transparent; border-radius: 12px; padding: 14px 16px; background: #202a45; font-size: 19px; font-weight: 800; letter-spacing: .01em; transition: border-color .18s ease, background .18s ease, color .18s ease; }
    .card[data-recommendation="left"] .lane-left { border-color: #60a5fa; background: #10264a; box-shadow: 0 0 22px rgba(96,165,250,.18); }
    .card[data-recommendation="left"] .lane-left .speed { color: #bfdbfe; }
    .card[data-recommendation="left"] .recommendation { border-color: #60a5fa; background: #173665; color: #eff6ff; }
    .card[data-recommendation="right"] .lane-right { border-color: #4ade80; background: #10291d; box-shadow: 0 0 22px rgba(74,222,128,.18); }
    .card[data-recommendation="right"] .lane-right .speed { color: #bbf7d0; }
    .card[data-recommendation="right"] .recommendation { border-color: #4ade80; background: #173d28; color: #ecfdf5; }
    .card[data-recommendation="neutral"] .recommendation { border-color: #64748b; background: #273044; color: #e2e8f0; }
    .card[data-recommendation="insufficient"] .recommendation { background: #202a45; color: #dbe2f1; }
    .meta { margin-top: 8px; color: #aeb6c7; font-size: 12px; }
    .warning { margin: 14px 0 0; border-radius: 12px; padding: 12px 14px; background: #382926; color: #ffd6cc; font-size: 13px; display: none; }
    button { width: 100%; margin-top: 16px; border: 0; border-radius: 14px; padding: 14px 16px; background: #eef2ff; color: #0b1020; font-size: 16px; font-weight: 700; }
    button:disabled { opacity: .55; }
    .footnote { margin: 14px 4px 0; color: #78839b; font-size: 11px; line-height: 1.5; }
  </style>
</head>
<body>
<main>
  <h1>雪山隧道即時車況</h1>
  <p class="subtitle">北上、南下左右車道即時速度與建議</p>
  <div class="status"><span id="updated">讀取中…</span><span id="state"></span></div>
  <div class="grid">
    <section class="card" data-direction="northbound">
      <h2>北上</h2>
      <div class="lanes">
        <div class="lane lane-left"><div class="lane-label">左線</div><div class="speed"><span data-left>—</span><span class="unit">km/h</span></div></div>
        <div class="lane lane-right"><div class="lane-label">右線</div><div class="speed"><span data-right>—</span><span class="unit">km/h</span></div></div>
      </div>
      <div class="recommendation" data-recommendation>讀取中</div>
      <div class="meta" data-meta></div>
    </section>
    <section class="card" data-direction="southbound">
      <h2>南下</h2>
      <div class="lanes">
        <div class="lane lane-left"><div class="lane-label">左線</div><div class="speed"><span data-left>—</span><span class="unit">km/h</span></div></div>
        <div class="lane lane-right"><div class="lane-label">右線</div><div class="speed"><span data-right>—</span><span class="unit">km/h</span></div></div>
      </div>
      <div class="recommendation" data-recommendation>讀取中</div>
      <div class="meta" data-meta></div>
    </section>
  </div>
  <div id="warning" class="warning"></div>
  <button id="refresh" type="button">重新整理</button>
  <p class="footnote">資料每分鐘自動更新。車況快速變化時仍以現場標誌、速限與安全駕駛為準。</p>
</main>
<script>
  const API = "/api/snow-tunnel";
  const REFRESH_MS = 60000;
  const labels = {
    left: "建議走左線 ←",
    right: "建議走右線 →",
    neutral: "兩線差異不大",
    insufficient: "資料不足，不提供建議"
  };

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "更新時間未知";
    return "更新 " + new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  }

  function renderDirection(name, data) {
    const el = document.querySelector('[data-direction="' + name + '"]');
    const recommendation = data.recommendation ?? "insufficient";
    el.dataset.recommendation = recommendation;
    el.querySelector("[data-left]").textContent = data.leftKph ?? "—";
    el.querySelector("[data-right]").textContent = data.rightKph ?? "—";
    el.querySelector("[data-recommendation]").textContent = labels[recommendation] ?? labels.insufficient;
    const delta = data.deltaKph == null ? "" : "｜差 " + data.deltaKph + " km/h";
    el.querySelector("[data-meta]").textContent = "有效偵測點 " + data.validStationCount + "/" + data.expectedStationCount + delta;
  }

  async function refresh(force = false) {
    const button = document.getElementById("refresh");
    const warning = document.getElementById("warning");
    button.disabled = true;
    const originalLabel = button.textContent;
    if (force) button.textContent = "更新中…";
    try {
      const url = force ? API + "?refresh=1&_=" + Date.now() : API;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      renderDirection("northbound", data.northbound);
      renderDirection("southbound", data.southbound);
      document.getElementById("updated").textContent = formatTime(data.updatedAt);
      document.getElementById("state").textContent = data.isStale ? "資料已過期" : "即時";
      warning.style.display = data.isStale ? "block" : "none";
      warning.textContent = data.isStale ? "目前資料已過期，暫不提供車道選擇建議。" : "";
    } catch (error) {
      document.getElementById("state").textContent = "無法更新";
      warning.style.display = "block";
      warning.textContent = "目前無法取得即時車況，請稍後再試。";
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  document.getElementById("refresh").addEventListener("click", () => refresh(true));
  refresh();
  setInterval(refresh, REFRESH_MS);
</script>
</body>
</html>`;
