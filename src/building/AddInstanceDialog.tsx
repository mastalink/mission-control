import { useState } from "react";
import { motion } from "framer-motion";
import { testGatewayConnection, type TestGatewayConnectionResult } from "../gateway/testGatewayConnection";
import { normalizeGatewayUrl } from "../gateway/connectionUtils";
import { useUIStore } from "../store/useUIStore";
import { useGatewayStore, type SavedConnection, type ConnectionStatus } from "../store/useGatewayStore";
import { DwightCoach } from "./DwightCoach";

type Props = {
  onConnect: (config: {
    instanceId: string;
    label: string;
    url: string;
    token?: string;
    autoConnect?: boolean;
  }) => void;
  onDisconnect?: (instanceId: string, options?: { forget?: boolean }) => void;
};

type ConnectionDraft = {
  instanceId: string | null;
  label: string;
  url: string;
  token: string;
  autoConnect: boolean;
};

type TestState =
  | { status: "idle" }
  | { status: "testing"; target: string }
  | { status: "success"; target: string; result: TestGatewayConnectionResult }
  | { status: "error"; target: string; message: string };

function createEmptyDraft(): ConnectionDraft {
  return {
    instanceId: null,
    label: "Scranton",
    url: "ws://localhost:18789",
    token: "",
    autoConnect: true,
  };
}

function createDraftFromSaved(conn: SavedConnection): ConnectionDraft {
  return {
    instanceId: conn.instanceId,
    label: conn.label,
    url: conn.url,
    token: conn.token ?? "",
    autoConnect: conn.autoConnect ?? true,
  };
}

function createCloneDraft(conn: SavedConnection): ConnectionDraft {
  return {
    instanceId: null,
    label: `${conn.label} Copy`,
    url: conn.url,
    token: conn.token ?? "",
    autoConnect: conn.autoConnect ?? true,
  };
}

function buildInstanceId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "gateway"}-${Date.now()}`;
}

function trimOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function formatAuthMode(mode: string | null | undefined): string {
  return mode ? mode.replace(/-/g, " ") : "unknown";
}

function statusDotClass(status?: ConnectionStatus): string {
  if (status === "connected") return "bg-emerald-400";
  if (status === "connecting") return "bg-amber-400 animate-pulse";
  if (status === "error") return "bg-rose-400";
  return "bg-slate-500";
}

function statusLabel(status?: ConnectionStatus): string {
  if (status === "connected") return "Connected";
  if (status === "connecting") return "Connecting";
  if (status === "error") return "Error";
  return "Offline";
}

function isActiveStatus(status?: ConnectionStatus): boolean {
  return status === "connected" || status === "connecting";
}

function badgeClass(active: boolean): string {
  return active
    ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
    : "border border-slate-700 bg-slate-900 text-slate-300";
}

function actionButtonClass(tone: "neutral" | "primary" | "danger" = "neutral"): string {
  if (tone === "primary") {
    return "rounded-md border border-sky-500/60 bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400";
  }
  if (tone === "danger") {
    return "rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20";
  }
  return "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white";
}

export function AddInstanceDialog({ onConnect, onDisconnect }: Props) {
  const show = useUIStore((s) => s.showAddInstance);
  const toggle = useUIStore((s) => s.toggleAddInstance);
  const uiMode = useUIStore((s) => s.uiMode);
  const savedConnections = useGatewayStore((s) => s.savedConnections);
  const instances = useGatewayStore((s) => s.instances);
  const saveConnection = useGatewayStore((s) => s.saveConnection);
  const removeSavedConnection = useGatewayStore((s) => s.removeSavedConnection);

  const [draft, setDraft] = useState<ConnectionDraft>(createEmptyDraft);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [notice, setNotice] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>({ status: "idle" });

  if (!show) return null;

  const orderedConnections = [...savedConnections].sort((a, b) => a.label.localeCompare(b.label));
  const liveCount = Object.keys(instances).length;
  const connectedCount = Object.values(instances).filter((inst) => inst.status === "connected").length;
  const currentLive = draft.instanceId ? instances[draft.instanceId] : null;
  const normalizedPreview = draft.url.trim() ? normalizeGatewayUrl(draft.url) : "";
  const canSave = Boolean(draft.label.trim() && draft.url.trim());
  const currentTarget = draft.instanceId ?? "draft";
  const testMatchesDraft = testState.status !== "idle" && testState.target === currentTarget;
  const primaryBusy = currentLive?.status === "connecting" || testState.status === "testing";
  const primaryLabel =
    currentLive && isActiveStatus(currentLive.status) ? "Reconnect Now" : "Connect Now";
  const isIdiotMode = uiMode === "idiot";

  const resetComposer = () => {
    setDraft(createEmptyDraft());
    setMode("create");
    setNotice(null);
    setTestState({ status: "idle" });
  };

  const handleClose = () => {
    resetComposer();
    toggle();
  };

  const patchDraft = (patch: Partial<ConnectionDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setNotice(null);
    setTestState({ status: "idle" });
  };

  const openEditor = (conn: SavedConnection) => {
    setDraft(createDraftFromSaved(conn));
    setMode("edit");
    setNotice(null);
    setTestState({ status: "idle" });
  };

  const openClone = (conn: SavedConnection) => {
    setDraft(createCloneDraft(conn));
    setMode("create");
    setNotice(`Cloning ${conn.label}. Save or connect it as a separate branch.`);
    setTestState({ status: "idle" });
  };

  const buildSavedConnection = (): SavedConnection | null => {
    if (!draft.label.trim() || !draft.url.trim()) return null;

    return {
      instanceId: draft.instanceId ?? buildInstanceId(draft.label),
      label: draft.label.trim(),
      url: normalizeGatewayUrl(draft.url),
      token: trimOptional(draft.token),
      autoConnect: draft.autoConnect,
    };
  };

  const handleSaveOnly = () => {
    const connection = buildSavedConnection();
    if (!connection) return;

    saveConnection(connection);
    setDraft(createDraftFromSaved(connection));
    setMode("edit");
    setNotice(
      currentLive
        ? "Saved. URL or token changes apply the next time this branch reconnects."
        : "Saved. You can connect it now or leave it for later."
    );
  };

  const handleConnectNow = (event: React.FormEvent) => {
    event.preventDefault();
    const connection = buildSavedConnection();
    if (!connection) return;

    onConnect(connection);
    setDraft(createDraftFromSaved(connection));
    setMode("edit");
    setNotice(`Connecting to ${connection.label}.`);
  };

  const runTest = async (candidate: ConnectionDraft, target: string) => {
    setNotice(null);
    setTestState({ status: "testing", target });

    try {
      const result = await testGatewayConnection({
        url: candidate.url,
        token: trimOptional(candidate.token),
      });

      setTestState({ status: "success", target, result });
      if (target === currentTarget) {
        setDraft((current) => ({ ...current, url: result.normalizedUrl }));
      }
    } catch (error) {
      setTestState({
        status: "error",
        target,
        message: error instanceof Error ? error.message : "Connection test failed.",
      });
    }
  };

  const handleTestCurrent = () => {
    void runTest(draft, currentTarget);
  };

  const handleQuickTest = (conn: SavedConnection) => {
    const nextDraft = createDraftFromSaved(conn);
    setDraft(nextDraft);
    setMode("edit");
    void runTest(nextDraft, conn.instanceId);
  };

  const handleQuickConnect = (conn: SavedConnection) => {
    onConnect({
      instanceId: conn.instanceId,
      label: conn.label,
      url: conn.url,
      token: conn.token,
      autoConnect: conn.autoConnect ?? true,
    });
    setNotice(`Connecting to ${conn.label}.`);
  };

  const handleDisconnect = (instanceId: string) => {
    onDisconnect?.(instanceId);
    if (draft.instanceId === instanceId) {
      setNotice("Disconnected. Saved settings remain available.");
    }
  };

  const handleDelete = (instanceId: string) => {
    if (onDisconnect) {
      onDisconnect(instanceId, { forget: true });
    } else {
      removeSavedConnection(instanceId);
    }

    if (draft.instanceId === instanceId) {
      resetComposer();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-6 sm:py-8"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-6xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_38%),linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(2,6,23,0.98))] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-sky-300/80">Connection Control</div>
              <h2 className="mt-2 text-2xl font-bold text-white font-dunder">
                {isIdiotMode ? "Connect Office" : "Gateway Control Room"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                {isIdiotMode
                  ? "Type the office name, server address, and secret key. The rest is optional because panic is not a setup strategy."
                  : "Test, save, edit, reconnect, clone, and remove OpenClaw gateways from one place."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2">
                <div className="text-lg font-semibold text-white">{orderedConnections.length}</div>
                <div>Saved</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2">
                <div className="text-lg font-semibold text-white">{liveCount}</div>
                <div>Loaded</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2">
                <div className="text-lg font-semibold text-white">{connectedCount}</div>
                <div>Connected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* Left: saved connections list */}
          <aside className="border-b border-slate-800 bg-slate-950/65 p-4 lg:border-b-0 lg:border-r lg:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Saved Gateways</div>
                <div className="text-xs text-slate-400">
                  {isIdiotMode ? "Saved office connections" : "Reusable connection profiles"}
                </div>
              </div>
              <button onClick={resetComposer} className={actionButtonClass()} type="button">
                New
              </button>
            </div>

            <div className="max-h-[34vh] space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(90vh-220px)]">
              {orderedConnections.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
                  No saved gateways yet. Build a profile on the right, test it, and save it for reuse.
                </div>
              )}

              {orderedConnections.map((conn) => {
                const live = instances[conn.instanceId];
                const selected = draft.instanceId === conn.instanceId;
                const tested =
                  testState.status !== "idle" && testState.target === conn.instanceId
                    ? testState
                    : null;

                return (
                  <div
                    key={conn.instanceId}
                    className={`rounded-2xl border p-4 transition ${
                      selected
                        ? "border-sky-500/60 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.16)]"
                        : "border-slate-800 bg-slate-900/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(live?.status)}`} />
                          <div className="truncate text-sm font-semibold text-white">{conn.label}</div>
                        </div>
                        <div className="mt-1 truncate font-mono text-[11px] text-slate-400">{conn.url}</div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wider ${badgeClass(conn.autoConnect !== false)}`}>
                        {conn.autoConnect === false ? "Manual" : "Auto"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                      <span className="rounded-full border border-slate-700 px-2 py-1">{statusLabel(live?.status)}</span>
                      {live?.serverVersion && (
                        <span className="rounded-full border border-slate-700 px-2 py-1">v{live.serverVersion}</span>
                      )}
                      {live?.authMode && (
                        <span className="rounded-full border border-slate-700 px-2 py-1">
                          {formatAuthMode(live.authMode)}
                        </span>
                      )}
                    </div>

                    {live?.error && (
                      <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        {live.error}
                      </div>
                    )}

                    {tested?.status === "success" && (
                      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                        Test passed in {tested.result.latencyMs}ms on protocol {tested.result.hello.protocol}.
                      </div>
                    )}

                    {tested?.status === "error" && (
                      <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        {tested.message}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {isActiveStatus(live?.status) ? (
                        <button
                          type="button"
                          onClick={() => handleDisconnect(conn.instanceId)}
                          className={actionButtonClass()}
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickConnect(conn)}
                          className={actionButtonClass("primary")}
                        >
                          Connect
                        </button>
                      )}
                      <button type="button" onClick={() => handleQuickTest(conn)} className={actionButtonClass()}>
                        Test
                      </button>
                      <button type="button" onClick={() => openEditor(conn)} className={actionButtonClass()}>
                        Edit
                      </button>
                      <button type="button" onClick={() => openClone(conn)} className={actionButtonClass()}>
                        Clone
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(conn.instanceId)}
                        className={actionButtonClass("danger")}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right: profile editor */}
          <section className="min-h-0 overflow-y-auto p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {mode === "edit"
                    ? isIdiotMode ? "Edit Office Connection" : "Edit Gateway Profile"
                    : isIdiotMode ? "New Office Connection" : "New Gateway Profile"}
                </div>
                <div className="text-sm text-slate-400">
                  {isIdiotMode
                    ? "Fill in the three boxes, then connect. Advanced controls stay out of your way unless you ask for them."
                    : "Save profiles for later, or connect immediately after testing."}
                </div>
              </div>
              <div className="flex gap-2">
                {mode === "edit" && (
                  <button type="button" onClick={resetComposer} className={actionButtonClass()}>
                    Clear Editor
                  </button>
                )}
                <button type="button" onClick={handleClose} className={actionButtonClass()}>
                  Close
                </button>
              </div>
            </div>

            {notice && (
              <div className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                {notice}
              </div>
            )}

            {currentLive && (
              <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                <div className="font-medium text-white">
                  {currentLive.label} is currently {statusLabel(currentLive.status).toLowerCase()}.
                </div>
                <div className="mt-1 text-slate-400">
                  Saved URL and token changes apply on the next reconnect.
                </div>
              </div>
            )}

            <form onSubmit={handleConnectNow} className="space-y-5">
              {isIdiotMode && (
                <DwightCoach
                  step="connect"
                  compact
                  headline="Connect the office before you try to make workers or chats."
                  detail="An office connection is the live wire into OpenClaw. No connection means no workers, no chats, no heroics."
                  nextActionLabel="Type the office name, server address, and secret key, then press Connect Now."
                />
              )}
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-200">
                      {isIdiotMode ? "Office Name" : "Branch Name"}
                    </label>
                    <input
                      type="text"
                      value={draft.label}
                      onChange={(event) => patchDraft({ label: event.target.value })}
                      placeholder="e.g. Scranton, Stamford, Corporate"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-200">
                      {isIdiotMode ? "Server Address" : "Gateway URL"}
                    </label>
                    <input
                      type="text"
                      value={draft.url}
                      onChange={(event) => patchDraft({ url: event.target.value })}
                      placeholder="ws://192.168.1.100:18789"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-sky-500"
                      required
                    />
                    {normalizedPreview && (
                      <div className="mt-2 text-xs text-slate-400">Normalized: {normalizedPreview}</div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-200">
                      {isIdiotMode ? "Secret Key" : "Auth Token"}
                    </label>
                    <input
                      type="password"
                      value={draft.token}
                      onChange={(event) => patchDraft({ token: event.target.value })}
                      placeholder="Leave blank for local or trusted gateways"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Options sidebar */}
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-sm font-semibold text-white">Profile Options</div>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <input
                      type="checkbox"
                      checked={draft.autoConnect}
                      onChange={(event) => patchDraft({ autoConnect: event.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-white">Auto-connect on launch</div>
                      <div className="mt-1 text-xs text-slate-400">
                        Disable for gateways you want saved but offline until you connect manually.
                      </div>
                    </div>
                  </label>

                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-400">
                    <div className="font-medium uppercase tracking-widest text-slate-300">Notes</div>
                    <div className="mt-2">Save-only keeps the profile without opening a socket.</div>
                    <div className="mt-1">Connect now saves the profile and starts the live session.</div>
                  </div>
                </div>
              </div>

              {/* Test bench */}
              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {isIdiotMode ? "Advanced Connection Test" : "Connection Test Bench"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {isIdiotMode
                        ? "Only use this if the obvious connect button fails."
                        : "Verifies the gateway handshake before committing the profile."}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestCurrent}
                    disabled={!canSave || testState.status === "testing"}
                    className={actionButtonClass()}
                  >
                    {testState.status === "testing" && testMatchesDraft ? "Testing…" : "Test Connection"}
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                  {testMatchesDraft && testState.status === "testing" && (
                    <div>Attempting the OpenClaw handshake against {normalizedPreview || draft.url}…</div>
                  )}

                  {testMatchesDraft && testState.status === "success" && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-widest text-slate-500">Latency</div>
                        <div className="mt-1 font-semibold text-emerald-200">{testState.result.latencyMs} ms</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-widest text-slate-500">Version</div>
                        <div className="mt-1 font-semibold text-white">
                          {testState.result.hello.server?.version ?? "unknown"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-widest text-slate-500">Protocol</div>
                        <div className="mt-1 font-semibold text-white">{testState.result.hello.protocol}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-widest text-slate-500">Auth Mode</div>
                        <div className="mt-1 font-semibold text-white">
                          {formatAuthMode(testState.result.hello.snapshot?.authMode)}
                        </div>
                      </div>
                      <div className="sm:col-span-2 xl:col-span-4">
                        <div className="text-[11px] uppercase tracking-widest text-slate-500">Normalized URL</div>
                        <div className="mt-1 break-all font-mono text-xs text-slate-200">
                          {testState.result.normalizedUrl}
                        </div>
                      </div>
                    </div>
                  )}

                  {testMatchesDraft && testState.status === "error" && (
                    <div className="text-rose-200">{testState.message}</div>
                  )}

                  {!testMatchesDraft && (
                    <div className="text-slate-400">
                      No recent test for the current draft. Use the button above to validate before saving.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  {mode === "edit"
                    ? "Editing an existing profile. Delete it from the left column to remove it entirely."
                    : "New profiles are saved locally in this browser."}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveOnly}
                    disabled={!canSave}
                    className={actionButtonClass()}
                  >
                    {mode === "edit" ? "Save Changes" : "Save Only"}
                  </button>
                  <button
                    type="submit"
                    disabled={!canSave || primaryBusy}
                    className={actionButtonClass("primary")}
                  >
                    {primaryBusy ? "Connecting…" : primaryLabel}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
