"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Plug, PlugZap } from "lucide-react"

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
  )
}
