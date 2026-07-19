import { describe, expect, it } from "vitest";
import { isAllowedForMarketing } from "./marketingWriteGate";

// Regression coverage for the marketing-role write allow-list used by the
// axios request interceptor in api.ts. Every entry here mirrors a backend
// dependency (allow_crm_access / allow_admin_or_marketing) — if one side
// changes without the other, a marketing account either (a) gets a false
// "no permission" modal on a page the backend explicitly allows them to
// use, or (b) silently relies on the backend to 403 a write the UI let
// through. Case (a) is exactly the bug found during marketing-account QA
// on 2026-07-18: the Push-уведомления page's "Отправить" button was
// blocked client-side even though the backend accepts it for `marketing`.
describe("isAllowedForMarketing", () => {
  describe("CRM tasks — mirrors allow_crm_access (full access, no delete)", () => {
    it.each([
      ["post", "/admin/crm/tasks"],
      ["patch", "/admin/crm/tasks/42"],
      ["patch", "/admin/crm/tasks/42/move"],
    ])("allows %s %s", (method, url) => {
      expect(isAllowedForMarketing(url, method)).toBe(true);
    });

    it("blocks deleting a CRM task", () => {
      expect(isAllowedForMarketing("/admin/crm/tasks/42", "delete")).toBe(false);
    });

    it("blocks deleting a CRM task even if the caller passes an uppercase method", () => {
      // The only current call site (api.ts) lowercases before calling in,
      // but this function is exported precisely so it can be reused/tested
      // independently of that — it must not silently trust the caller.
      expect(isAllowedForMarketing("/admin/crm/tasks/42", "DELETE")).toBe(false);
    });

    // Card subresources share allow_crm_access on the backend; their
    // DELETE is a normal edit (detach file/link/assignee), not the
    // destructive task-delete, so it must pass too.
    it.each([
      ["post", "/admin/crm/tasks/42/attachments"],
      ["delete", "/admin/crm/tasks/42/attachments/7"],
      ["post", "/admin/crm/tasks/42/links"],
      ["delete", "/admin/crm/tasks/42/links/13"],
      ["post", "/admin/crm/tasks/42/assignees"],
      ["delete", "/admin/crm/tasks/42/assignees/a1b2-c3"],
      ["post", "/admin/crm/tasks/42/comments"],
    ])("allows %s %s (card subresources)", (method, url) => {
      expect(isAllowedForMarketing(url, method)).toBe(true);
    });

    it("does not let an unknown subresource ride the CRM allow-list", () => {
      expect(isAllowedForMarketing("/admin/crm/tasks/42/secrets", "post")).toBe(false);
    });
  });

  describe("Push notifications — mirrors allow_admin_or_marketing", () => {
    it.each([
      "/admin/notifications/send",
      "/admin/notifications/send-test",
      "/admin/notifications/send-to-phone",
    ])("allows POST %s", (url) => {
      expect(isAllowedForMarketing(url, "post")).toBe(true);
    });

    it("strips the query string before matching", () => {
      expect(isAllowedForMarketing("/admin/notifications/send?foo=bar", "post")).toBe(true);
    });

    it("does not match a path that merely starts with the same prefix", () => {
      // /admin/notifications/send-test-extra is NOT /send-test — must not
      // match by accidental prefix overlap.
      expect(isAllowedForMarketing("/admin/notifications/send-test-extra", "post")).toBe(false);
    });

    it("does not open up the rest of the /admin/notifications router", () => {
      // e.g. a hypothetical admin-only sub-route on the same prefix must
      // stay blocked — only the three named push actions are allowed.
      expect(isAllowedForMarketing("/admin/notifications/test/send", "post")).toBe(false);
    });

    it("only allows POST on the push routes, not other methods on the same path", () => {
      // The backend only exposes POST on these 3 routes (notifications_send.py),
      // so a client-side match on path alone (ignoring method) would be
      // needlessly permissive for a hypothetical future PUT/PATCH/DELETE
      // handler added at the same path.
      expect(isAllowedForMarketing("/admin/notifications/send", "delete")).toBe(false);
      expect(isAllowedForMarketing("/admin/notifications/send", "put")).toBe(false);
      expect(isAllowedForMarketing("/admin/notifications/send", "patch")).toBe(false);
    });
  });

  describe("everything else stays blocked for a marketing-only account", () => {
    it.each([
      ["post", "/admin/subjects"],
      ["patch", "/admin/users/123"],
      ["delete", "/admin/questions/5"],
      ["put", "/admin/app-settings/some_key"],
      ["post", "/admin/promocodes"],
    ])("blocks %s %s", (method, url) => {
      expect(isAllowedForMarketing(url, method)).toBe(false);
    });
  });
});
