"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Copy, Check, AlertTriangle, Wifi, WifiOff } from "lucide-react"

interface SessionConnectProps {
  sessionId: string
  onConnectionChange: (connected: boolean) => void
  onClientStatusChange: (status: "online" | "offline") => void
  onClientInfoChange: (info: { url?: string; userAgent?: string } | null) => void
}

export function SessionConnect({
  sessionId,
  onConnectionChange,
  onClientStatusChange,
  onClientInfoChange,
}: SessionConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [copied, setCopied] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"
  const agentCode = `(function(){var s=document.createElement("script");s.src="${serverUrl}/agent.js?session=${sessionId}";document.head.appendChild(s);})();`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(agentCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const connect = () => {
    if (!sessionId.trim()) return

    setIsConnecting(true)
    setConnectionError(null)
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"
    const websocket = new WebSocket(wsUrl)

    websocket.onopen = () => {
      websocket.send(
        JSON.stringify({
          type: "viewer_connect",
          sessionId: sessionId.trim(),
        }),
      )
      setWs(websocket)
      setIsConnected(true)
      setIsConnecting(false)
      setRetryCount(0)
      setConnectionError(null)
      onConnectionChange(true)
    }

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === "client_status") {
          onClientStatusChange(data.status)
          onClientInfoChange(data.clientInfo)
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
      }
    }

    websocket.onclose = () => {
      setIsConnected(false)
      setIsConnecting(false)
      setWs(null)
      onConnectionChange(false)
      onClientStatusChange("offline")
      onClientInfoChange(null)
    }

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error)
      setIsConnecting(false)
      setConnectionError("Failed to connect to WebSocket server. Make sure the server is deployed and accessible.")
    }
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
    }
  }

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [ws])

  return (
    <div className="space-y-5">
      {connectionError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 animate-slide-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="space-y-3 flex-1">
              <p className="text-sm font-semibold text-destructive">Connection Failed</p>
              <p className="text-xs text-destructive/80 leading-relaxed">{connectionError}</p>
              <div className="text-xs text-destructive/70 space-y-3">
                <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                  <p className="font-semibold mb-2">Production Setup:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs">
                    <li>Deploy WebSocket server to Railway, Render, or Heroku</li>
                    <li>Configure NEXT_PUBLIC_WS_URL and NEXT_PUBLIC_SERVER_URL</li>
                    <li>Redeploy your Vercel application</li>
                  </ol>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                  <p className="font-semibold mb-2">Local Development:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs">
                    <li>
                      Run: <code className="bg-destructive/20 px-2 py-0.5 rounded text-xs">npm run server</code>
                    </li>
                    <li>Click "Connect" to retry</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!isConnected ? (
          <Button
            onClick={connect}
            disabled={!sessionId.trim() || isConnecting}
            className="flex-1 gap-3 h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Establishing Connection...
              </>
            ) : (
              <>
                <Wifi className="h-5 w-5" />
                Connect to Session
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={disconnect}
            variant="destructive"
            className="flex-1 gap-3 h-12 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <WifiOff className="h-5 w-5" />
            Disconnect Session
          </Button>
        )}
      </div>

      <div className="bg-muted/30 rounded-xl p-4 border border-border/30 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Connection Status</span>
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              isConnected
                ? "bg-green-500/10 text-green-600 border border-green-500/20"
                : "bg-muted text-muted-foreground border border-border/30"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`}
            />
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">WebSocket:</span>
            <code className="bg-background/50 px-2 py-1 rounded text-xs font-mono">
              {process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}
            </code>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">Server:</span>
            <code className="bg-background/50 px-2 py-1 rounded text-xs font-mono">
              {process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"}
            </code>
          </div>
        </div>
      </div>

      {sessionId && (
        <div className="space-y-3 animate-slide-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Injection Code</h3>
            <Button
              onClick={copyToClipboard}
              size="sm"
              variant="ghost"
              className="h-8 gap-2 hover:bg-secondary/10 transition-all duration-200"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Code
                </>
              )}
            </Button>
          </div>
          <div className="relative group">
            <pre className="bg-background/50 border border-border/30 rounded-xl p-4 text-xs font-mono overflow-x-auto transition-all duration-200 group-hover:border-secondary/30">
              <code className="text-foreground/90">{agentCode}</code>
            </pre>
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Paste this code into any website's browser console to establish a debugging connection.
          </p>
        </div>
      )}
    </div>
  )
}
