"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Download } from "lucide-react"

interface ConsoleLog {
  type: string
  level: "log" | "error" | "warn" | "info"
  message: string
  timestamp: string
  url?: string
}

interface ConsoleViewProps {
  sessionId: string
}

export function ConsoleView({ sessionId }: ConsoleViewProps) {
  const [logs, setLogs] = useState<ConsoleLog[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (!sessionId) return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"
    const websocket = new WebSocket(wsUrl)

    websocket.onopen = () => {
      websocket.send(
        JSON.stringify({
          type: "viewer_connect",
          sessionId: sessionId,
        }),
      )
      setWs(websocket)
    }

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === "logs_history") {
          setLogs(data.logs || [])
        } else if (data.type === "new_log") {
          setLogs((prevLogs) => [...prevLogs, data])
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
      }
    }

    websocket.onclose = () => {
      setWs(null)
    }

    return () => {
      websocket.close()
    }
  }, [sessionId])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const clearLogs = () => {
    setLogs([])
  }

  const exportLogs = () => {
    const logText = logs
      .map((log) => `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`)
      .join("\n")

    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `console-logs-${sessionId}-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      setAutoScroll(isAtBottom)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case "error":
        return "❌"
      case "warn":
        return "⚠️"
      case "info":
        return "ℹ️"
      default:
        return "📝"
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-card-foreground">Console</h2>
          <span className="text-sm text-muted-foreground">({logs.length} logs)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportLogs} variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={clearLogs} variant="outline" size="sm" className="gap-2 bg-transparent">
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Console Logs */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-background p-4 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="mb-2 text-2xl">📟</div>
              <p>No console logs yet</p>
              <p className="text-xs">Logs will appear here when the client starts logging</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`console-log flex items-start gap-3 rounded px-2 py-1 hover:bg-muted/20 ${log.level}`}
              >
                <span className="text-xs text-muted-foreground">{getLogIcon(log.level)}</span>
                <span className="text-xs text-muted-foreground">{formatTimestamp(log.timestamp)}</span>
                <div className="flex-1">
                  <pre className="whitespace-pre-wrap break-words">{log.message}</pre>
                  {log.url && <div className="mt-1 text-xs text-muted-foreground">from: {log.url}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <div className="border-t border-border bg-card px-4 py-2">
          <Button
            onClick={() => {
              setAutoScroll(true)
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              }
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Scroll to bottom
          </Button>
        </div>
      )}
    </div>
  )
}
