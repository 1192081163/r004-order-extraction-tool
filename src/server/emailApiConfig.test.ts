import { describe, expect, test } from "vitest";

import { loadEmailApiConfig } from "./emailApiConfig.js";

describe("email API config", () => {
  test("loads mailbox and token settings from environment", () => {
    expect(
      loadEmailApiConfig({
        EMAIL_API_TOKEN: " token ",
        EMAIL_ACCOUNT: " orders@example.com ",
        EMAIL_AUTH_CODE: " secret ",
        EMAIL_IMAP_SERVER: " imap.example.com ",
        EMAIL_IMAP_PORT: "1993",
        EMAIL_API_HOST: "0.0.0.0",
        EMAIL_API_PORT: "9090",
      }),
    ).toEqual({
      token: "token",
      host: "0.0.0.0",
      port: 9090,
      email: "orders@example.com",
      authCode: "secret",
      server: "imap.example.com",
      imapPort: 1993,
    });
  });

  test("uses safe local defaults for host, HTTP port, and IMAP settings", () => {
    expect(
      loadEmailApiConfig({
        EMAIL_API_TOKEN: "token",
        EMAIL_ACCOUNT: "orders@example.com",
        EMAIL_AUTH_CODE: "secret",
      }),
    ).toMatchObject({
      host: "127.0.0.1",
      port: 8787,
      server: "imap.exmail.qq.com",
      imapPort: 993,
    });
  });

  test("rejects missing required secrets with a concrete variable name", () => {
    expect(() => loadEmailApiConfig({})).toThrow("EMAIL_API_TOKEN");
    expect(() => loadEmailApiConfig({ EMAIL_API_TOKEN: "token" })).toThrow("EMAIL_ACCOUNT");
    expect(() =>
      loadEmailApiConfig({
        EMAIL_API_TOKEN: "token",
        EMAIL_ACCOUNT: "orders@example.com",
      }),
    ).toThrow("EMAIL_AUTH_CODE");
  });

  test("rejects invalid ports", () => {
    expect(() =>
      loadEmailApiConfig({
        EMAIL_API_TOKEN: "token",
        EMAIL_ACCOUNT: "orders@example.com",
        EMAIL_AUTH_CODE: "secret",
        EMAIL_API_PORT: "nope",
      }),
    ).toThrow("EMAIL_API_PORT");

    expect(() =>
      loadEmailApiConfig({
        EMAIL_API_TOKEN: "token",
        EMAIL_ACCOUNT: "orders@example.com",
        EMAIL_AUTH_CODE: "secret",
        EMAIL_IMAP_PORT: "0",
      }),
    ).toThrow("EMAIL_IMAP_PORT");
  });
});
