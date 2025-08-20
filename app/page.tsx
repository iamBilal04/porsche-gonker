"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Terminal, Circle, Copy } from "lucide-react"
import { SessionConnect } from "@/components/session-connect"
import { ConsoleView } from "@/components/console-view"
import { CommandInput } from "@/components/command-input"

export default function RemoteDebugDashboard() {
  const [sessionId, setSessionId] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [clientStatus, setClientStatus] = useState<"online" | "offline">("offline")
  const [clientInfo, setClientInfo] = useState<{ url?: string; userAgent?: string } | null>(null)

  const generateSessionId = () => {
    const newSessionId = Math.random().toString(36).substring(2, 15)
    setSessionId(newSessionId)
  }

  const copyAgentScript = () => {
    const agentUrl = `http://localhost:3001/agent.js?session=${sessionId}`
    const scriptTag = `<script src="${agentUrl}"></script>`
    navigator.clipboard.writeText(scriptTag)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Terminal className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-card-foreground">RemoteDebug Console</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={clientStatus === "online" ? "default" : "secondary"} className="gap-1">
              <Circle
                className={`h-2 w-2 ${clientStatus === "online" ? "fill-green-500 text-green-500" : "fill-gray-500 text-gray-500"}`}
              />
              {clientStatus === "online" ? "Client Online" : "Client Offline"}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-80 border-r border-border bg-sidebar p-4">
          <div className="space-y-6">
            {/* Session Management */}
            <Card className="p-4">
              <h2 className="mb-4 font-semibold text-card-foreground">Session Management</h2>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter session ID"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={generateSessionId} variant="outline" size="sm">
                    Generate
                  </Button>
                </div>
                <SessionConnect
                  sessionId={sessionId}
                  onConnectionChange={setIsConnected}
                  onClientStatusChange={setClientStatus}
                  onClientInfoChange={setClientInfo}
                />
              </div>
            </Card>

            {/* Agent Script */}
            {sessionId && (
              <Card className="p-4">
                <h2 className="mb-4 font-semibold text-card-foreground">Agent Script</h2>
                <div className="space-y-3">
                  <div className="rounded bg-muted p-3 text-xs font-mono text-muted-foreground">
                    {`<script src="http://localhost:3001/agent.js?session=${sessionId}"></script>`}
                  </div>
                  <Button onClick={copyAgentScript} variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                    <Copy className="h-4 w-4" />
                    Copy Script Tag
                  </Button>
                </div>
              </Card>
            )}

            {/* Client Info */}
            {clientInfo && (
              <Card className="p-4">
                <h2 className="mb-4 font-semibold text-card-foreground">Client Info</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">URL:</span>
                    <div className="break-all font-mono text-xs">{clientInfo.url}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">User Agent:</span>
                    <div className="break-all font-mono text-xs">{clientInfo.userAgent}</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex flex-1 flex-col">
          {isConnected ? (
            <>
              {/* Console View */}
              <div className="flex-1 overflow-hidden">
                <ConsoleView sessionId={sessionId} />
              </div>

              {/* Command Input */}
              <div className="border-t border-border bg-card p-4">
                <CommandInput sessionId={sessionId} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Terminal className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Session Connected</h2>
                <p className="text-muted-foreground">Enter a session ID and connect to start debugging</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
