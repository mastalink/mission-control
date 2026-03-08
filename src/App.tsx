import { useEffect } from "react";
import { useGatewayConnection } from "./gateway/useGatewayConnection";
import { setGatewayConnectFns } from "./gateway/gatewayRef";
import { useUIStore } from "./store/useUIStore";
import { useSoundEffects } from "./audio/useSoundEffects";

import { NavSidebar } from "./building/NavSidebar";
import { TopBar } from "./building/TopBar";
import { Dashboard } from "./building/Dashboard";
import { FloorPlanPage } from "./building/FloorPlanPage";
import { EmployeeRoster } from "./building/EmployeeRoster";
import { GatewayTerminal } from "./building/GatewayTerminal";
import { SplashScreen } from "./building/SplashScreen";
import { Sidebar } from "./panels/Sidebar";
import { AddInstanceDialog } from "./building/AddInstanceDialog";

export function App() {
  const { connect, disconnect, reconnectSaved } = useGatewayConnection();
  useSoundEffects();

  // Expose connect/disconnect to module-level callers (e.g. terminal)
  useEffect(() => {
    setGatewayConnectFns(connect, disconnect);
  }, [connect, disconnect]);

  useEffect(() => {
    reconnectSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePage = useUIStore((s) => s.activePage);

  if (activePage === "splash") {
    return <SplashScreen />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-dunder-blue">
      {/* Left navigation sidebar */}
      <NavSidebar />

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />

        <main className="flex-1 overflow-hidden relative">
          {activePage === "dashboard"  && <Dashboard onConnect={connect} />}
          {activePage === "floorplan"  && <FloorPlanPage />}
          {activePage === "roster"     && <EmployeeRoster />}
          {activePage === "ops"        && <GatewayTerminal />}

          {/* Right side panel (agent detail, chat, etc.) */}
          <Sidebar />
        </main>
      </div>

      <AddInstanceDialog onConnect={connect} onDisconnect={disconnect} />
    </div>
  );
}
