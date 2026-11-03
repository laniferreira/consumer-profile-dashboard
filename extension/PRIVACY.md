# Extension privacy disclosures

**Single purpose:** let a person explicitly transfer a selected date range of Chrome browsing history into the matching Consumer Intelligence Lab page for local analysis.

**Data accessed:** the `history` permission is used after the user presses Connect Chrome in the dashboard. The connector reads history URLs, page titles, and last-visit timestamps within the selected period. Chrome may show a permission approval step when the extension is installed.

**Data use and transfer:** selected records are passed from the extension content script to the exact dashboard page open in the same browser. The content script has access only to the dashboard's GitHub Pages origin and the local Vite development origin so this handoff can work. The extension makes no network requests and sends no data to a server. The dashboard processes records in browser memory; it does not persist raw records by default. Do not use the dashboard on a device or profile you do not control.

**Data not accessed:** passwords, cookies, authentication tokens, page contents, downloads, bookmarks, and account credentials.

**Control:** close or reset the dashboard to remove in-memory records. Remove/disable the extension in `chrome://extensions` to revoke its access. Chrome's extension permission controls remain authoritative.

**Permission justification:** `history` is the only Chrome API permission required to query user-selected history records. The content script's match patterns grant the minimum website access needed for a handoff to the GitHub Pages dashboard and local Vite development page. There is no background service worker, remote code, analytics, or external API.
