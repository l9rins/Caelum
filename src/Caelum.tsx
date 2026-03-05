import { useStore } from "./lib/store";
import { AppHeader } from "./components/AppHeader";
import { Sidebar } from "./components/Sidebar";
import { PlayerView } from "./components/PlayerView";
import { EmptyState } from "./components/EmptyState";

export default function Caelum() {
  const buf = useStore((s: { buf: Uint8Array | null }) => s.buf);

  if (!buf) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--background)" }}>
        <AppHeader />
        <EmptyState />
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--background)", overflow: "hidden" }}>
      <AppHeader />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar />
        <PlayerView />
      </div>
    </div>
  );
}
