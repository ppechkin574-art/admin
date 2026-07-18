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
