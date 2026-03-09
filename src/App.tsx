import { useEffect } from "react";
import { useGatewayConnection } from "./gateway/useGatewayConnection";
import { useUIStore } from "./store/useUIStore";
import { useSoundEffects } from "./audio/useSoundEffects";

import { NavSidebar } from "./building/NavSidebar";
import { TopBar } from "./building/TopBar";
import { Dashboard } from "./building/Dashboard";
import { FloorPlanPage } from "./building/FloorPlanPage";
import { EmployeeRoster } from "./building/EmployeeRoster";
import { SessionDesk } from "./building/SessionDesk";
import { SplashScreen } from "./building/SplashScreen";
import { Sidebar } from "./panels/Sidebar";
import { AddInstanceDialog } from "./building/AddInstanceDialog";

export function App() {
  const { connect, disconnect, reconnectSaved } = useGatewayConnection();
  useSoundEffects();

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
          {activePage === "desk"       && <SessionDesk />}

          {/* Right side panel (agent detail, chat, etc.) */}
          <Sidebar />
        </main>
      </div>

      <AddInstanceDialog onConnect={connect} onDisconnect={disconnect} />
    </div>
  );
}
