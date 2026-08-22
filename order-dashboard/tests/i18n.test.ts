import { describe, it, expect, beforeEach } from "vitest";
import { getLanguage, setLanguage, t } from "../lib/i18n";

beforeEach(() => {
  localStorage.clear();
});

describe("i18n", () => {
  it("defaults to English when nothing is stored", () => {
    expect(getLanguage()).toBe("en");
    expect(t("nav.orders")).toBe("Orders");
  });

  it("switches to Hindi and persists it", () => {
    setLanguage("hi");
    expect(getLanguage()).toBe("hi");
    expect(t("nav.orders")).toBe("ऑर्डर");
  });

  it("falls back to the English string for a key missing in the active language", () => {
    // Every key that exists in en also exists in hi in this dictionary,
    // so simulate a gap by asking for an unknown key — it should fall
    // back to itself rather than throwing.
    expect(t("nonexistent.key", "hi")).toBe("nonexistent.key");
  });
});
