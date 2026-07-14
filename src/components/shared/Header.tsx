import {
  Settings as SettingsIcon,
  RefreshCw,
  LogOut,
  HardDrive,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onSettingsClick: () => void;
  textColor?: string;
  accentColor?: string;
  isAuthenticated?: boolean;
  user?: { email: string; name?: string; picture?: string } | null;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  onSyncClick?: () => void;
  isAuthLoading?: boolean;
  isSyncing?: boolean;
  totalGroups?: number;
  totalTabs?: number;
}

export function Header({
  onSettingsClick,
  textColor,
  accentColor,
  isAuthenticated = false,
  user,
  onLoginClick,
  onLogoutClick,
  onSyncClick,
  isAuthLoading = false,
  isSyncing = false,
  totalGroups = 0,
  totalTabs = 0,
}: HeaderProps) {
  const fg = textColor || "var(--theme-text)";
  const accent = accentColor || textColor || "var(--theme-text)";

  return (
    <header
      className="mb-6 pb-4 border-b"
      style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <img src="./icon.svg" alt="" className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <h1
              className="text-xl font-semibold tracking-tight"
              style={{
                color: fg,
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
              }}
            >
              TooManyTabs
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                style={{
                  borderColor: isAuthenticated
                    ? "rgba(52,211,153,0.35)"
                    : "rgba(255,255,255,0.12)",
                  color: fg,
                  background: isAuthenticated
                    ? "rgba(52,211,153,0.1)"
                    : "rgba(255,255,255,0.04)",
                }}
              >
                {isAuthenticated ? (
                  <Cloud className="h-3 w-3" style={{ color: "#34D399" }} />
                ) : (
                  <HardDrive className="h-3 w-3 opacity-70" />
                )}
                {isAuthenticated ? "Synced account" : "This device only"}
              </span>
              {(totalGroups > 0 || totalTabs > 0) && (
                <span className="text-[11px] opacity-50" style={{ color: fg }}>
                  {totalGroups} group{totalGroups !== 1 ? "s" : ""} ·{" "}
                  {totalTabs} tab
                  {totalTabs !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isAuthLoading && (
            <>
              {isAuthenticated && user ? (
                <>
                  <span
                    className="mr-1 hidden max-w-[160px] truncate text-xs opacity-60 sm:inline"
                    style={{ color: fg }}
                    title={user.email}
                  >
                    {user.email}
                  </span>
                  {onSyncClick && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onSyncClick}
                      disabled={isSyncing}
                      className="rounded-xl"
                      style={{ color: accent }}
                      aria-label="Sync now"
                      title="Sync now"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                      />
                    </Button>
                  )}
                  {onLogoutClick && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onLogoutClick}
                      className="rounded-xl"
                      style={{ color: fg }}
                      aria-label="Log out"
                      title="Log out"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                onLoginClick && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLoginClick}
                    className="mr-1 rounded-xl text-xs"
                    style={{
                      color: accent,
                      borderColor: "rgba(255,255,255,0.18)",
                    }}
                  >
                    Sign in
                  </Button>
                )
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="rounded-xl"
            style={{ color: accent }}
            aria-label="Open settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
