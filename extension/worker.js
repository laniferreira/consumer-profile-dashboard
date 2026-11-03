'use strict';

const allowedOrigins = new Set([
  'https://laniferreira.github.io',
  'http://localhost:5173',
]);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'QUERY_SELECTED_HISTORY' || !allowedOrigins.has(new URL(sender.url || 'about:blank').origin)) return;
  const days = Math.max(1, Math.min(1825, Number(message.days) || 90));
  const startTime = Date.now() - days * 86400000;
  chrome.history.search({ text: '', startTime, maxResults: 10000 }).then(history => {
    sendResponse({ records: history.map(item => ({
      url: item.url,
      title: item.title || '',
      date: item.lastVisitTime ? new Date(item.lastVisitTime).toISOString() : '',
      visitCount: item.visitCount || 1,
      source: 'Chrome history',
      kind: 'visit',
    })) });
  }).catch(error => sendResponse({ error: String(error?.message || 'Chrome did not return history. Check extension permissions.') }));
  return true;
});
