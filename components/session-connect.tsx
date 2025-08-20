"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Plug, PlugZap, Copy, Check } from "lucide-react"

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

  const agentCode = `(function(){var s=document.createElement("script");s.src="http://localhost:3001/agent.js?session=${sessionId}";document.head.appendChild(s);})();`

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
    const websocket = new WebSocket("ws://localhost:3001")

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
      setConnectionError("Failed to connect to WebSocket server. Make sure the server is running on port 3001.")
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
    <div className="space-y-4">
      {connectionError && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
          <div className="flex items-start gap-2">
            <div className="text-red-400">⚠️</div>
            <div className="space-y-2">
              <p className="text-sm text-red-400 font-medium">Connection Error</p>
              <p className="text-xs text-red-300">{connectionError}</p>
              <div className="text-xs text-red-300/80">
                <p>
                  <strong>To fix this:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 mt-1">
                  <li>Open a terminal in your project directory</li>
                  <li>
                    Run: <code className="bg-red-500/20 px-1 rounded">npm run server</code>
                  </li>
                  <li>
                    Or run both server and frontend: <code className="bg-red-500/20 px-1 rounded">npm run dev:all</code>
                  </li>
                  <li>Then click "Connect" again</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!isConnected ? (
          <Button onClick={connect} disabled={!sessionId.trim() || isConnecting} className="flex-1 gap-2">
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            {isConnecting ? "Connecting..." : "Connect"}
          </Button>
        ) : (
          <Button onClick={disconnect} variant="destructive" className="flex-1 gap-2">
            <PlugZap className="h-4 w-4" />
            Disconnect
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
        <p>
          <strong>Server Status:</strong> {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </p>
        <p>
          <strong>Required:</strong> WebSocket server must be running on port 3001
        </p>
        <p>
          <strong>Start server:</strong> <code>npm run server</code> or <code>npm run dev:all</code>
        </p>
      </div>

      {sessionId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Agent Code</h3>
            <Button onClick={copyToClipboard} size="sm" variant="ghost" className="h-8 gap-1">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <div className="relative">
            <pre className="bg-console-bg border border-console-border rounded-md p-3 text-xs text-console-text font-mono overflow-x-auto">
              <code>{agentCode}</code>
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste this code into your website's console or add it to your HTML to start debugging.
          </p>
        </div>
      )}
    </div>
  )
}
