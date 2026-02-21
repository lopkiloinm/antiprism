"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { getWebRTCSignalingConfig, setWebRTCSignalingConfig } from "@/lib/settings";
import { IconTrash2, IconSquare, IconCheckSquare } from "./Icons";
import { SignalingServerModal } from "./SignalingServerModal";

interface SignalingServer {
  id: string;
  url: string;
  enabled: boolean;
  createdAt: number;
}

const DEFAULT_SERVERS: SignalingServer[] = [
  { id: "local", url: "ws://localhost:4444", enabled: false, createdAt: Date.now() - 1000000 },
  { id: "public-1", url: "wss://signaling.yjs.dev", enabled: false, createdAt: Date.now() - 900000 },
  { id: "public-2", url: "wss://y-webrtc-signaling-eu.herokuapp.com", enabled: false, createdAt: Date.now() - 800000 },
  { id: "public-3", url: "wss://y-webrtc-signaling-us.herokuapp.com", enabled: false, createdAt: Date.now() - 700000 },
  { id: "public-4", url: "wss://y-webrtc-eu.fly.dev", enabled: false, createdAt: Date.now() - 600000 },
];

interface SignalingServerListProps {
  searchQuery: string;
  viewMode: "list" | "icons";
  onNewServer?: () => void;
}

export const SignalingServerList = forwardRef<{ handleNewServer: () => void }, SignalingServerListProps>(({ searchQuery, viewMode, onNewServer }, ref) => {
  const [servers, setServers] = useState<SignalingServer[]>(DEFAULT_SERVERS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle the + New button click from header
  const handleNewServer = () => {
    setIsModalOpen(true);
  };

  // Expose handleNewServer to parent via ref
  useImperativeHandle(ref, () => ({
    handleNewServer
  }));

  // Load saved config on mount
  useEffect(() => {
    const config = getWebRTCSignalingConfig();
    
    // Update servers based on saved config
    const updatedServers = DEFAULT_SERVERS.map(server => ({
      ...server,
      enabled: config.customServers.includes(server.url)
    }));
    
    // Add any custom servers not in defaults
    const customServers = config.customServers.filter(url => 
      !DEFAULT_SERVERS.some(s => s.url === url)
    );
    
    const additionalServers = customServers.map((url, index) => ({
      id: `custom-${index}`,
      url,
      enabled: true,
      createdAt: Date.now() - 500000 + index
    }));
    
    setServers([...updatedServers, ...additionalServers]);
  }, []);

  const handleToggleServer = (serverId: string) => {
    const updatedServers = servers.map(server => 
      server.id === serverId ? { ...server, enabled: !server.enabled } : server
    );
    setServers(updatedServers);
    
    // Update WebRTC config
    const enabledServers = updatedServers.filter(s => s.enabled).map(s => s.url);
    setWebRTCSignalingConfig({
      ...getWebRTCSignalingConfig(),
      customServers: enabledServers,
      enabled: enabledServers.length > 0
    });
  };

  const handleAddServer = (url: string) => {
    const newServer: SignalingServer = {
      id: `custom-${Date.now()}`,
      url: url.trim(),
      enabled: true,
      createdAt: Date.now()
    };
    
    const updatedServers = [...servers, newServer];
    setServers(updatedServers);
    
    // Update WebRTC config
    const enabledServers = updatedServers.filter(s => s.enabled).map(s => s.url);
    setWebRTCSignalingConfig({
      ...getWebRTCSignalingConfig(),
      customServers: enabledServers,
      enabled: enabledServers.length > 0
    });
  };

  const handleDeleteServer = (serverId: string) => {
    const updatedServers = servers.filter(server => server.id !== serverId);
    setServers(updatedServers);
    
    // Update WebRTC config
    const enabledServers = updatedServers.filter(s => s.enabled).map(s => s.url);
    setWebRTCSignalingConfig({
      ...getWebRTCSignalingConfig(),
      customServers: enabledServers,
      enabled: enabledServers.length > 0
    });
  };

  const filteredServers = servers.filter(server =>
    server.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredServers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-sm">
        No signaling servers found. Add one with + New.
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <>
        <div className="flex-1 overflow-auto">
          <div className="divide-y divide-[var(--border)]">
            {filteredServers.map((server) => (
              <div
                key={server.id}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] group"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Toggle server enabled/disabled state
                      handleToggleServer(server.id);
                    }}
                    className={`p-1.5 -m-1.5 rounded hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] transition-colors ${
                    server.enabled ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                  >
                    {server.enabled ? <IconCheckSquare /> : <IconSquare />}
                  </button>
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">{server.url}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {server.id.startsWith('custom') ? 'Custom server' : 'Public server'} · {server.enabled ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {server.id.startsWith('custom') && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteServer(server.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity"
                      title="Delete server"
                    >
                      <IconTrash2 />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <SignalingServerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleAddServer}
        />
      </>
    );
  }

  // Icons view
  return (
    <>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
          {filteredServers.map((server) => {
            return (
              <div
                key={server.id}
                className="flex flex-col items-center p-4 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_30%,transparent)] transition-colors group relative"
              >
                <div className="absolute top-2 left-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Toggle server enabled/disabled state
                      handleToggleServer(server.id);
                    }}
                    className={`p-1.5 -m-1.5 rounded hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] transition-colors ${
                    server.enabled ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                  >
                    {server.enabled ? <IconCheckSquare /> : <IconSquare />}
                  </button>
                </div>
                <div className="absolute top-2 right-2">
                  {server.id.startsWith('custom') && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteServer(server.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-red-400 hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-opacity"
                      title="Delete server"
                    >
                      <IconTrash2 />
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-center mt-8">
                  <span className="text-sm font-medium text-[var(--foreground)] text-center">
                    {server.url}
                  </span>
                  <span className="text-xs text-[var(--muted)] mt-1">
                    {server.id.startsWith('custom') ? 'Custom server' : 'Public server'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <SignalingServerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleAddServer}
      />
    </>
  );
});
