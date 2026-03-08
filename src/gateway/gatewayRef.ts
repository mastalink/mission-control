import type { GatewayManager } from "./GatewayManager";
import type { InstanceConfig } from "./GatewayManager";

/**
 * Module-level singleton reference to the GatewayManager.
 * Set once during useGatewayConnection() init, then accessible
 * from any component that needs to make RPC calls (e.g. ChatPanel).
 */
let _manager: GatewayManager | null = null;
let _connectFn: ((config: InstanceConfig & { token?: string; password?: string }) => void) | null = null;
let _disconnectFn: ((instanceId: string, opts?: { forget?: boolean }) => void) | null = null;

export function setGatewayManager(manager: GatewayManager): void {
  _manager = manager;
}

export function getGatewayManager(): GatewayManager | null {
  return _manager;
}

export function setGatewayConnectFns(
  connect: (config: InstanceConfig & { token?: string; password?: string }) => void,
  disconnect: (instanceId: string, opts?: { forget?: boolean }) => void,
): void {
  _connectFn = connect;
  _disconnectFn = disconnect;
}

export function gatewayConnect(config: InstanceConfig & { token?: string; password?: string }): void {
  _connectFn?.(config);
}

export function gatewayDisconnect(instanceId: string, opts?: { forget?: boolean }): void {
  _disconnectFn?.(instanceId, opts);
}
