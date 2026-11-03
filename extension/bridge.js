(() => {
  'use strict';
  const dashboardOrigin = location.origin;
  const allowed = dashboardOrigin === 'https://laniferreira.github.io' || dashboardOrigin === 'http://localhost:5173';
  const app = 'consumer-profile-dashboard';
  if (!allowed) return;
  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== dashboardOrigin || event.data?.source !== app || event.data?.type !== 'CONNECT') return;
    const reply = { source: app, type: 'HISTORY_RESULT' };
    try {
      const days = Math.max(1, Math.min(1825, Number(event.data.period) || 90));
      const startTime = Date.now() - days * 86400000;
      const history = await chrome.history.search({ text: '', startTime, maxResults: 10000 });
      reply.records = history.map(item => ({ url: item.url, title: item.title || '', date: item.lastVisitTime ? new Date(item.lastVisitTime).toISOString() : '', visitCount: item.visitCount || 1, source: 'Chrome history', kind: 'visit' }));
    } catch (error) {
      reply.error = String(error?.message || 'Chrome did not return history. Check the extension permission.');
    }
    window.postMessage(reply, dashboardOrigin);
  });
})();
