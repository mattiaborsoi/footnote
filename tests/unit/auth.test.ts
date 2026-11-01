import { describe, expect, it } from "vitest";
import { formatCode, hashSecret, newCode, newToken, sameHash } from "@/lib/auth/codes";
import { emailKey, isThrowaway, maskEmail } from "@/lib/auth/normalise";
import { safeNext } from "@/lib/auth";
import { allow, resetRateLimits } from "@/lib/ratelimit";

describe("emailKey", () => {
  it("lower-cases and trims", () => { expect(emailKey("  Someone@Example.COM ")).toBe("someone@example.com"); });
  it("drops plus-tags everywhere", () => { expect(emailKey("someone+trial2@example.com")).toBe("someone@example.com"); });
  it("folds Gmail dots and its alias domain", () => {
    expect(emailKey("some.one+x@gmail.com")).toBe("someone@gmail.com"); // privacy-ok: pattern, not a person
    expect(emailKey("some.one@googlemail.com")).toBe("someone@gmail.com"); // privacy-ok: pattern, not a person
  });
  it("keeps dots elsewhere", () => { expect(emailKey("some.one@example.org")).toBe("some.one@example.org"); });
  it("rejects what is not an address", () => {
    expect(emailKey("nobody")).toBeNull();
    expect(emailKey("@example.com")).toBeNull();
    expect(emailKey("+only@example.com")).toBeNull();
    expect(emailKey("a@b")).toBeNull();
  });
});

describe("throwaway and masking", () => {
  it("knows a disposable domain", () => { expect(isThrowaway("x@mailinator.com")).toBe(true); expect(isThrowaway("x@example.com")).toBe(false); }); // privacy-ok: a service, not a person
  it("masks to the first letter", () => { expect(maskEmail("someone@example.com")).toBe("s•••@example.com"); });
});

describe("codes and tokens", () => {
  it("makes six digits and a long token", () => { expect(newCode()).toMatch(/^\d{6}$/); expect(newToken().length).toBeGreaterThan(40); });
  it("hashes with the secret folded in", () => {
    expect(hashSecret("123456", "a")).not.toBe(hashSecret("123456", "b"));
    expect(sameHash(hashSecret("123456", "a"), hashSecret("123456", "a"))).toBe(true);
    expect(sameHash(hashSecret("123456", "a"), hashSecret("123457", "a"))).toBe(false);
  });
  it("formats for reading aloud", () => { expect(formatCode("123456")).toBe("123 456"); });
});

describe("safeNext", () => {
  it("accepts a path and refuses an address", () => {
    expect(safeNext("/w/abc?x=1")).toBe("/w/abc?x=1");
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext(undefined)).toBeNull();
  });
});

describe("rate limit", () => {
  it("allows up to the limit in the window, then not", () => {
    resetRateLimits();
    expect(allow("k", 2, 1000, 0)).toBe(true);
    expect(allow("k", 2, 1000, 10)).toBe(true);
    expect(allow("k", 2, 1000, 20)).toBe(false);
    expect(allow("k", 2, 1000, 1500)).toBe(true);
  });
});
