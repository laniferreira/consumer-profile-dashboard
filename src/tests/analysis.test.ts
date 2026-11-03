import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { analyze, parseImport } from '../analysis';

describe('local analysis safety and imports', () => {
  it('counts observed keyword matches and domains from supplied data', () => {
    const result = analyze([
      { url: 'https://shop.example/products/laptop', title: 'Laptop reviews', source: 'file', date: '2026-01-01' },
      { url: 'https://shop.example/phones', title: 'Phone comparison', source: 'file', date: '2026-01-02' },
    ]);
    expect(result.records).toHaveLength(2);
    expect(result.domains).toContainEqual(['shop.example', 2]);
    expect(result.interests.find(x => x.label === 'Technology')?.count).toBe(2);
    expect(result.days).toBe(2);
  });

  it('excludes sensitive-topic records from profile signals', () => {
    const result = analyze([
      { url: 'https://shop.example/laptop', title: 'Laptop shopping', source: 'file' },
      { url: 'https://clinic.example/health', title: 'Health', source: 'file' },
    ]);
    expect(result.records).toHaveLength(1);
    expect(result.excluded).toBe(1);
    expect(result.interests.some(x => x.label === 'Technology')).toBe(true);
  });

  it('only reads user-authored messages in ChatGPT conversation exports', () => {
    const conversation = [{ mapping: {
      u: { message: { author: { role: 'user' }, create_time: 1700000000, content: { parts: ['I am researching cameras'] } } },
      a: { message: { author: { role: 'assistant' }, create_time: 1700000001, content: { parts: ['You may like cameras'] } } },
    } }];
    const records = parseImport('conversations.json', JSON.stringify(conversation));
    expect(records).toHaveLength(1);
    expect(records[0].text).toBe('I am researching cameras');
    expect(records[0].source).toBe('conversations.json');
  });

  it('rejects unsupported imports with a clear message', () => {
    expect(() => parseImport('archive.zip', '')).toThrow('Choose a CSV, JSON or JSONL export.');
  });

  it('parses quoted CSV product titles and weights repeat visits', () => {
    const rows = parseImport('product_catalog.csv', 'url,title,price,visit_count\nhttps://shop.example/item,"Camera, compact",$299,4');
    expect(rows[0].title).toBe('Camera, compact');
    expect(rows[0].kind).toBe('product');
    expect(rows[0].price).toBe('$299');
    expect(analyze([{ ...rows[0], title: 'Camera, compact laptop', visitCount: 4 }]).interests[0].count).toBe(4);
  });

  it('limits the extension bridge to the dashboard origin and explicit connect events', async () => {
    let listener: ((event: any) => void) | undefined;
    let queries = 0;
    let reply: any;
    const context = {
      location: { origin: 'http://localhost:5173' },
      window: {
        addEventListener: (_: string, fn: (event: any) => void) => { listener = fn; },
        postMessage: (message: any, target: string) => { reply = { message, target }; },
      },
      chrome: { history: { search: async (options: any) => { queries++; return [{ url: 'https://example.test/', title: 'Test', lastVisitTime: options.startTime + 5 }]; } } },
      Date, Math, Number, String,
    };
    runInNewContext(readFileSync(resolve('extension/bridge.js'), 'utf8'), context);
    await listener?.({ source: {}, origin: 'http://localhost:5173', data: { source: 'consumer-profile-dashboard', type: 'CONNECT', period: 90 } });
    expect(queries).toBe(0);
    await listener?.({ source: context.window, origin: 'http://localhost:5173', data: { source: 'consumer-profile-dashboard', type: 'PING', period: 90 } });
    expect(queries).toBe(0);
    await listener?.({ source: context.window, origin: 'http://localhost:5173', data: { source: 'consumer-profile-dashboard', type: 'CONNECT', period: 30 } });
    expect(queries).toBe(1);
    expect(reply.target).toBe('http://localhost:5173');
    expect(reply.message.records[0].source).toBe('Chrome history');
  });

  it('declares only the history API and exact dashboard match patterns', () => {
    const manifest = JSON.parse(readFileSync(resolve('extension/manifest.json'), 'utf8'));
    expect(manifest.permissions).toEqual(['history']);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.content_scripts[0].matches).toEqual([
      'https://laniferreira.github.io/consumer-profile-dashboard/*',
      'http://localhost:5173/*',
    ]);
  });
});
