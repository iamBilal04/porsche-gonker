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
