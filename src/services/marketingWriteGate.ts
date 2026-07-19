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

// Card subresources (attachments/links/assignees/comments) are gated on
// the same allow_crm_access on the backend, and unlike the task itself
// their DELETE is a normal CRM edit (detach a file/link/assignee), not a
// destructive admin action — so DELETE is allowed here.
const isCrmTaskExtraWrite = (path: string): boolean =>
  /^\/admin\/crm\/tasks\/[^/]+\/(attachments|links|assignees|comments)(\/[^/]+)?$/.test(path);

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
  // Normalize here rather than trust the caller — api.ts happens to
  // lowercase before calling in today, but this function is exported
  // specifically so it's reusable/unit-testable outside that one call
  // site, and an uppercase "DELETE" must not silently slip through.
  const m = (method || "").toLowerCase();
  // All 3 push routes are POST-only on the backend (see
  // notifications_send.py) — matching on path alone would also let a
  // hypothetical PUT/PATCH/DELETE to the same path through client-side.
  if (isMarketingPushWrite(path)) return m === "post";
  if (isCrmTaskExtraWrite(path)) return true;
  return isCrmTaskWrite(path) && m !== "delete";
}

// Question bank writes (POST/PATCH/DELETE /admin/questions...) are never
// in the marketing allow-list above — a marketing account is blocked from
// touching the question DB entirely. NoPermissionModal's generic "нет
// прав" text is fine for most blocked routes, but this one is common
// enough (and confusing enough without context) to get its own wording.
const isQuestionsWrite = (path: string): boolean => /^\/admin\/questions(\/.*)?$/.test(path);

export function blockedActionMessage(url: string): string | undefined {
  const path = (url || "").split("?")[0];
  if (isQuestionsWrite(path)) {
    return "Редактирование базы вопросов доступно только главному администратору. Если это нужно — обратитесь к нему.";
  }
  return undefined;
}
