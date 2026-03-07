import { create } from "zustand";
import type { ChannelAccountSnapshot, ChannelsStatusResult } from "../gateway/types";

export type ChannelState = {
  channelId: string;
  label: string;
  connected: boolean;
  configured: boolean;
  accounts: ChannelAccountSnapshot[];
  lastInboundAt: number | null;
  lastOutboundAt: number | null;
  lastError: string | null;
};

type ChannelStore = {
  channels: Record<string, Record<string, ChannelState>>; // instanceId -> channelId -> state

  setChannels: (instanceId: string, result: ChannelsStatusResult) => void;
  removeInstance: (instanceId: string) => void;
};

export const useChannelStore = create<ChannelStore>((set) => ({
  channels: {},

  setChannels: (instanceId, result) =>
    set((state) => {
      const channelStates: Record<string, ChannelState> = {};

      for (const channelId of result.channelOrder) {
        const accounts = result.channelAccounts[channelId] ?? [];
        const anyConnected = accounts.some((a) => a.connected);
        const anyConfigured = accounts.some((a) => a.configured);
        const lastInbound = accounts.reduce((max, a) => Math.max(max, a.lastInboundAt ?? 0), 0);
        const lastOutbound = accounts.reduce((max, a) => Math.max(max, a.lastOutboundAt ?? 0), 0);
        const lastErr = accounts.find((a) => a.lastError)?.lastError ?? null;

        channelStates[channelId] = {
          channelId,
          label: result.channelLabels[channelId] ?? channelId,
          connected: anyConnected,
          configured: anyConfigured,
          accounts,
          lastInboundAt: lastInbound || null,
          lastOutboundAt: lastOutbound || null,
          lastError: lastErr,
        };
      }

      return { channels: { ...state.channels, [instanceId]: channelStates } };
    }),

  removeInstance: (instanceId) =>
    set((state) => {
      const { [instanceId]: _, ...rest } = state.channels;
      return { channels: rest };
    }),
}));
