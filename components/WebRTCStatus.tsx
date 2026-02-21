"use client";

import { useState, useEffect } from "react";
import { IconWifi, IconWifiOff, IconUsers, IconLock } from "./Icons";

interface WebRTCStatusProps {
  provider: any;
  config: any;
}

export function WebRTCStatus({ provider, config }: WebRTCStatusProps) {
  const [status, setStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
  const [peerCount, setPeerCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!provider) return;

    const handleStatus = (event: any) => {
      setStatus(event.status === "connected" ? "connected" : event.status === "connecting" ? "connecting" : "disconnected");
    };

    const handlePeers = (event: any) => {
      setPeerCount(event.peers?.length || 0);
    };

    provider.on("status", handleStatus);
    provider.on("peers", handlePeers);

    // Set initial status
    if (provider && provider.connected) {
      setStatus("connected");
    }

    return () => {
      if (provider) {
        provider.off("status", handleStatus);
        provider.off("peers", handlePeers);
      }
    };
  }, [provider]);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--border)_10%,transparent)] rounded">
        <span>
          <IconWifiOff />
        </span>
        <span>WebRTC disabled</span>
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-[var(--muted)] bg-[color-mix(in_srgb,var(--border)_10%,transparent)] rounded">
        <span>
          <IconWifiOff />
        </span>
        <span>WebRTC disabled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--border)_10%,transparent)] rounded">
      {status === "connected" ? (
        <span className="text-green-500">
          <IconWifi />
        </span>
      ) : status === "connecting" ? (
        <span className="text-yellow-500 animate-pulse">
          <IconWifi />
        </span>
      ) : (
        <span className="text-red-500">
          <IconWifiOff />
        </span>
      )}
      
      <span className={`${
        status === "connected" ? "text-green-500" : 
        status === "connecting" ? "text-yellow-500" : 
        "text-red-500"
      }`}>
        {status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Disconnected"}
      </span>

      {peerCount > 0 && (
        <div className="flex items-center gap-1 text-[var(--muted)]">
          <IconUsers />
          <span>{peerCount}</span>
        </div>
      )}

      {config.password && (
        <span className="text-[var(--muted)]" title="Encrypted signaling">
          <IconLock />
        </span>
      )}

      {config.customServers.length > 0 && (
        <span className="text-[var(--muted)]" title={`Using ${config.customServers.length} custom server(s)`}>
          Custom
        </span>
      )}
    </div>
  );
}
