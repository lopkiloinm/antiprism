"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { getWebRTCSignalingConfig, setWebRTCSignalingConfig } from "@/lib/settings";
import { IconTrash2, IconServer } from "./Icons";
import { SignalingServerModal } from "./SignalingServerModal";
import { DashboardView, DashboardItemProps } from "./DashboardView";

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

  const dashboardItems: DashboardItemProps[] = filteredServers.map((server) => {
    return {
      id: server.id,
      title: server.url,
      subtitle: `${server.id.startsWith('custom') ? 'Custom server' : 'Public server'} · ${server.enabled ? 'Active' : 'Inactive'}`,
      icon: <IconServer />,
      leftAccessory: (
        <button
            role="switch"
            aria-checked={server.enabled}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleServer(server.id);
            }}
            className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
              server.enabled
                ? "bg-[color-mix(in_srgb,var(--accent)_60%,transparent)]"
                : "bg-[color-mix(in_srgb,var(--border)_70%,transparent)]"
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                server.enabled ? "left-[22px]" : "left-1"
              }`}
            />
          </button>
      ),
      topRightAccessory: server.id.startsWith('custom') ? (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDeleteServer(server.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity cursor-pointer"
          title="Delete server"
        >
          <IconTrash2 />
        </div>
      ) : undefined,
    };
  });

  return (
    <>
      <DashboardView 
        items={dashboardItems}
        viewMode={viewMode}
        emptyContent="No signaling servers found. Add one with + New."
      />
      <SignalingServerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleAddServer}
      />
    </>
  );
});
