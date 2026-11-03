# Consumer Intelligence Lab

A private-by-default consumer behavior classroom lab. React + TypeScript + Vite dashboard; analysis runs in the browser, without external AI APIs or analytics. The dashboard does not contain a built-in sample persona and reports no profile until the user supplies real records.

## Local development

Requires Node.js 20+ and npm. Run `npm ci` then `npm run dev` and open `http://localhost:5173`.

## Chrome local connector

1. Open Chrome at `chrome://extensions` and turn on **Developer mode**.
2. Choose **Load unpacked** and select this repository's `extension` folder.
3. Read the Chrome permission dialog and allow the `history` permission if you want to connect.
4. Open the dashboard and choose a history window, then press **Connect Chrome**. Only then does the extension query the selected period and pass records to this dashboard page.
5. Remove the extension in `chrome://extensions` to revoke access. Use **Data & privacy** in the dashboard to clear records held in memory.

The extension has no background worker, broad host access, remote code, telemetry, or network calls. It can run a content script only on `https://laniferreira.github.io/consumer-profile-dashboard/` and `http://localhost:5173/` to relay the user-initiated request. There is no Chrome Web Store listing yet; do not treat this developer installation as a published extension.

## Imports and analysis

Supports CSV/TSV URL records and JSON/JSONL browser records. For ChatGPT conversation JSON, only messages whose author role is `user` are considered; assistant responses are ignored. Quoted content inside user-authored text cannot be reliably separated. The lightweight category matcher is deliberately conservative and not a validated model. Interest signal strength is `min(98, round(26 + 17 × log2(weighted matches + 1)))`; weights come from visit counts where supplied. Shopping tendencies use disclosed keyword rules, three or four matching visits as the minimum, and a rough signal indicator `min(95, round(35 + 15 × matches / minimum))`. That indicator is not a probability or validated psychological score. Sensitive-topic keyword matches are excluded from profile summaries and remain visible in the privacy screen as excluded records so the user can remove them. A match is not proof of a preference. Thin data is labeled insufficient.

Product lookup is not scraped. Retailer URLs can be opened as source links; actual recommendations require a product catalog voluntarily supplied by the user. No product price, rating, stock, or description is fetched or invented.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds and deploys on pushes to `main`. In the GitHub repository, set Pages' build source to **GitHub Actions**. Vite is configured for `/consumer-profile-dashboard/`.

## Store review checklist

Before any Chrome Web Store submission, review the current Chrome Web Store policies, capture final permission screenshots, and publish the `extension/PRIVACY.md` disclosures at a stable public URL. No listing has been submitted or approved.

## Privacy

Raw records are held in app memory only. Closing or reloading the page clears them. The extension sends only a user-triggered date-limited history query to this open dashboard page. No record is sent to GitHub, a server, an analytics provider, or an AI API. Avoid entering sensitive data in this classroom project. See `extension/PRIVACY.md`.
