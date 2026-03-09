import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { normalizeGatewayUrl, buildConnectRequestParams } from "./connectionUtils";

describe("connectionUtils", () => {
  describe("normalizeGatewayUrl", () => {
    test("returns empty string for empty input", () => {
      expect(normalizeGatewayUrl("")).toBe("");
      expect(normalizeGatewayUrl("  ")).toBe("");
    });

    test("preserves ws:// and wss:// protocols", () => {
      expect(normalizeGatewayUrl("ws://localhost:18789")).toBe("ws://localhost:18789");
      expect(normalizeGatewayUrl("wss://example.com")).toBe("wss://example.com");
    });

    test("converts http/https to ws/wss", () => {
      expect(normalizeGatewayUrl("http://localhost:18789")).toBe("ws://localhost:18789");
      expect(normalizeGatewayUrl("https://example.com")).toBe("wss://example.com");
    });

    test("adds ws:// prefix to host:port", () => {
      expect(normalizeGatewayUrl("localhost:18789")).toBe("ws://localhost:18789");
      expect(normalizeGatewayUrl("127.0.0.1:8080")).toBe("ws://127.0.0.1:8080");
    });

    test("adds ws:// prefix and default port to bare hostname", () => {
      expect(normalizeGatewayUrl("localhost")).toBe("ws://localhost:18789");
      expect(normalizeGatewayUrl("example.com")).toBe("ws://example.com:18789");
    });

    test("handles hostnames with paths (current behavior attaches port to end)", () => {
      expect(normalizeGatewayUrl("example.com/path")).toBe("ws://example.com/path:18789");
    });
  });

  describe("buildConnectRequestParams", () => {
    const originalNavigator = globalThis.navigator;

    beforeAll(() => {
      // @ts-ignore - Mocking navigator for testing
      globalThis.navigator = {
        language: "en-US",
        userAgent: "Mozilla/5.0 (Test)",
      };
    });

    afterAll(() => {
      // @ts-ignore
      globalThis.navigator = originalNavigator;
    });

    test("builds correct params with only instanceId", () => {
      const input = { instanceId: "test-instance" };
      const params = buildConnectRequestParams(input);

      expect(params).toEqual({
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "webchat-ui",
          displayName: "Dunder Mifflin Mission Control",
          version: "0.1.0",
          platform: "web",
          mode: "webchat",
          instanceId: "test-instance",
        },
        role: "operator",
        scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
        caps: [],
        locale: "en-US",
        userAgent: "Mozilla/5.0 (Test)",
        auth: {
          token: undefined,
          password: undefined,
        },
      });
    });

    test("builds correct params with token and password", () => {
      const input = {
        instanceId: "test-instance",
        token: "secret-token",
        password: "secret-password",
      };
      const params = buildConnectRequestParams(input);

      expect(params.auth).toEqual({
        token: "secret-token",
        password: "secret-password",
      });
    });
  });
});
