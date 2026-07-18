// ── Marketing write-permission gate ─────────────────────────────────────
// Backend already 403s a marketing-role token on almost every write route
// (see allow_read_or_admin_write / allow_crm_access in the backend). The
// axios request interceptor in `api.ts` uses this to give a marketing
// account a friendly "no permission" modal instead of a raw failed-request
// toast — no page needs its own permission check, this is the single
// choke point every mutating request goes through.
//
// Pulled into its own module (no axios/keycloak imports) so the gate logic
// can be unit-tested without needing a mocked Keycloak/browser environment.
// See marketingWriteGate.test.ts.

// CRM task create/update/move stays open to marketing; deleting a task
// (and every other admin write) does not. Mirrors allow_crm_access.
const isCrmTaskWrite = (path: string): boolean =>
  /^\/admin\/crm\/tasks(\/[^/]+(\/move)?)?$/.test(path);

// Push-уведомления (POST /admin/notifications/send, /send-test,
// /send-to-phone) is the other marketing write surface: the backend
// router gates it on `allow_admin_or_marketing` (see the "Marketing
// surface" comment in notifications_send.py) specifically so a
// marketing account can broadcast/test/personal-send push — that's the
// whole point of the Push-уведомления page for that role. This allow-list
// has to mirror that or a marketing user gets a client-side "no
// permission" modal on a page the backend explicitly lets them use.
//
// Found during marketing-account QA (2026-07-18): the page was reachable
// and the backend accepted the write, but this gate didn't have the
// route listed, so every "Отправить" button silently no-opped for a
// marketing-only account. Fixed by adding the push routes here.
const isMarketingPushWrite = (path: string): boolean =>
  /^\/admin\/notifications\/(send|send-test|send-to-phone)$/.test(path);

export function isAllowedForMarketing(url: string, method: string): boolean {
  const path = (url || "").split("?")[0];
  if (isMarketingPushWrite(path)) return true;
  return isCrmTaskWrite(path) && method !== "delete";
}
