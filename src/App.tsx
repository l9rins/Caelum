import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider, useStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";
import { PlayerView } from "@/components/PlayerView";

function LoadingOverlay() {
  const { state } = useStore();
  if (!state.isLoading) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-void/80 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
      <div className="w-9 h-9 border-2 border-cborder2 border-t-cyan rounded-full animate-spin-slow" />
      <div className="font-dmono text-[.72rem] text-ctext3">
        {state.loadingMsg}
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <>
      <LoadingOverlay />
      <div className="main-grid relative z-[1] grid grid-rows-[52px_1fr] grid-cols-[300px_1fr] h-screen">
        <AppHeader />
        <Sidebar />
        <PlayerView />
      </div>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          className:
            "bg-ccard border-cborder font-dmono text-[.7rem] shadow-[0_8px_24px_rgba(0,0,0,0.5)] clip-corner",
        }}
      />
    </>
  );
}

function App() {
  return (
    <StoreProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </StoreProvider>
  );
}

export default App;
