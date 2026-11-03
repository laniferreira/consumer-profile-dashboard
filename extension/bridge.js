(() => {
  'use strict';
  const dashboardOrigin = location.origin;
  const allowed = dashboardOrigin === 'https://laniferreira.github.io' || dashboardOrigin === 'http://localhost:5173';
  const app = 'consumer-profile-dashboard';
  if (!allowed) return;
  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== dashboardOrigin || event.data?.source !== app || event.data?.type !== 'CONNECT') return;
    const days = Math.max(1, Math.min(1825, Number(event.data.period) || 90));
    chrome.runtime.sendMessage({ type: 'QUERY_SELECTED_HISTORY', days }, reply => {
      const error = chrome.runtime.lastError;
      window.postMessage({ source: app, type: 'HISTORY_RESULT', ...(error ? { error: error.message } : reply || { error: 'The extension returned no result.' }) }, dashboardOrigin);
    });
  });
})();
