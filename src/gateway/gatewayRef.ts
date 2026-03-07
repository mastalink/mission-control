import type { GatewayManager } from "./GatewayManager";

/**
 * Module-level singleton reference to the GatewayManager.
 * Set once during useGatewayConnection() init, then accessible
 * from any component that needs to make RPC calls (e.g. ChatPanel).
 */
let _manager: GatewayManager | null = null;

export function setGatewayManager(manager: GatewayManager): void {
  _manager = manager;
}

export function getGatewayManager(): GatewayManager | null {
  return _manager;
}
