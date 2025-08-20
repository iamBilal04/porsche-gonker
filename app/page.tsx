"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Terminal, Circle, Copy, Sparkles, Zap } from "lucide-react"
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
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"
    const agentCode = `(function(){var s=document.createElement("script");s.src="${serverUrl}/agent.js?session=${sessionId}";document.head.appendChild(s);})();`
    navigator.clipboard.writeText(agentCode)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-effect border-b border-border/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Terminal className="h-8 w-8 text-secondary" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-secondary rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">RemoteDebug</h1>
              <p className="text-sm text-muted-foreground font-medium">Professional Console</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Badge
              variant={clientStatus === "online" ? "default" : "secondary"}
              className={`gap-2 px-4 py-2 text-sm font-medium transition-all duration-300 ${
                clientStatus === "online"
                  ? "bg-green-500/10 text-green-600 border-green-500/20 shadow-green-500/20 shadow-lg"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Circle
                className={`h-2.5 w-2.5 ${
                  clientStatus === "online"
                    ? "fill-green-500 text-green-500 animate-pulse"
                    : "fill-muted-foreground text-muted-foreground"
                }`}
              />
              {clientStatus === "online" ? "Client Connected" : "Awaiting Connection"}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-97px)]">
        <aside className="w-96 border-r border-border/50 bg-sidebar/50 backdrop-blur-sm">
          <div className="p-6 space-y-6">
            {/* Session Management */}
            <Card className="p-6 border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="h-5 w-5 text-secondary" />
                <h2 className="text-lg font-bold text-card-foreground">Session Control</h2>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter session ID..."
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="flex-1 bg-input/50 border-border/50 focus:border-secondary/50 focus:ring-secondary/20 transition-all duration-200"
                  />
                  <Button
                    onClick={generateSessionId}
                    variant="outline"
                    size="default"
                    className="px-4 bg-secondary/5 border-secondary/20 hover:bg-secondary/10 hover:border-secondary/30 transition-all duration-200"
                  >
                    <Zap className="h-4 w-4" />
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
              <Card className="p-6 border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in">
                <div className="flex items-center gap-3 mb-6">
                  <Terminal className="h-5 w-5 text-secondary" />
                  <h2 className="text-lg font-bold text-card-foreground">Injection Script</h2>
                </div>
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="rounded-lg bg-muted/50 p-4 border border-border/30 font-mono text-sm text-muted-foreground overflow-x-auto">
                      <code className="break-all">
                        {`(function(){var s=document.createElement("script");s.src="${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"}/agent.js?session=${sessionId}";document.head.appendChild(s);})();`}
                      </code>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-accent/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <Button
                    onClick={copyAgentScript}
                    variant="outline"
                    size="default"
                    className="w-full gap-3 bg-secondary/5 border-secondary/20 hover:bg-secondary/10 hover:border-secondary/30 transition-all duration-200"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Injection Code
                  </Button>
                </div>
              </Card>
            )}

            {/* Client Info */}
            {clientInfo && (
              <Card className="p-6 border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in">
                <div className="flex items-center gap-3 mb-6">
                  <Circle className="h-5 w-5 text-green-500 fill-green-500 animate-pulse" />
                  <h2 className="text-lg font-bold text-card-foreground">Client Details</h2>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <span className="text-muted-foreground font-medium">Active URL:</span>
                    <div className="break-all font-mono text-xs bg-muted/30 p-3 rounded-md border border-border/30">
                      {clientInfo.url}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-muted-foreground font-medium">User Agent:</span>
                    <div className="break-all font-mono text-xs bg-muted/30 p-3 rounded-md border border-border/30">
                      {clientInfo.userAgent}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </aside>

        <main className="flex flex-1 flex-col bg-background">
          {isConnected ? (
            <>
              {/* Console View */}
              <div className="flex-1 overflow-hidden">
                <ConsoleView sessionId={sessionId} />
              </div>

              {/* Command Input */}
              <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm p-6">
                <CommandInput sessionId={sessionId} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center space-y-6 max-w-md">
                <div className="relative">
                  <Terminal className="mx-auto h-16 w-16 text-muted-foreground/50" />
                  <div className="absolute -top-2 -right-2 h-6 w-6 bg-secondary/20 rounded-full flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-secondary" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-foreground">Ready to Debug</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Generate a session ID and connect to start remote debugging any website in real-time
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
                  <div className="h-1 w-1 bg-secondary rounded-full animate-pulse" />
                  <span>Professional Remote Console</span>
                  <div className="h-1 w-1 bg-secondary rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
