"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, History, X, Copy, Check } from "lucide-react"

interface CommandResult {
  commandId: string
  command: string
  result: string
  success: boolean
  timestamp: string
}

interface CommandInputProps {
  sessionId: string
}

export function CommandInput({ sessionId }: CommandInputProps) {
  const [command, setCommand] = useState("")
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [results, setResults] = useState<CommandResult[]>([])
  const [pendingCommands, setPendingCommands] = useState<Set<string>>(new Set())
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showHistory, setShowHistory] = useState(false)
  const [copiedResults, setCopiedResults] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!sessionId) return

    const websocket = new WebSocket("ws://localhost:3001")

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

        if (data.type === "command_result") {
          setResults((prev) => [
            ...prev,
            {
              commandId: data.commandId,
              command: data.command || "Unknown command",
              result: data.result,
              success: data.success,
              timestamp: new Date().toISOString(),
            },
          ])
          setPendingCommands((prev) => {
            const newSet = new Set(prev)
            newSet.delete(data.commandId)
            return newSet
          })
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

  const executeCommand = () => {
    if (!command.trim() || !ws) return

    const commandId = Math.random().toString(36).substring(2, 15)
    const trimmedCommand = command.trim()

    // Add to history
    setCommandHistory((prev) => {
      const newHistory = [trimmedCommand, ...prev.filter((cmd) => cmd !== trimmedCommand)]
      return newHistory.slice(0, 50) // Keep last 50 commands
    })

    // Send command
    ws.send(
      JSON.stringify({
        type: "execute_command",
        sessionId: sessionId,
        commandId: commandId,
        command: trimmedCommand,
      }),
    )

    setPendingCommands((prev) => new Set([...prev, commandId]))
    setCommand("")
    setHistoryIndex(-1)
    setShowHistory(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      executeCommand()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setCommand(commandHistory[newIndex])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(commandHistory[newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand("")
      }
    } else if (e.key === "Escape") {
      setShowHistory(false)
      setHistoryIndex(-1)
    }
  }

  const selectHistoryCommand = (cmd: string) => {
    setCommand(cmd)
    setShowHistory(false)
    setHistoryIndex(-1)
    inputRef.current?.focus()
  }

  const clearResults = () => {
    setResults([])
  }

  const copyResult = (result: CommandResult) => {
    navigator.clipboard.writeText(result.result)
    setCopiedResults((prev) => new Set([...prev, result.commandId]))
    setTimeout(() => {
      setCopiedResults((prev) => {
        const newSet = new Set(prev)
        newSet.delete(result.commandId)
        return newSet
      })
    }, 2000)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="space-y-4">
      {/* Command Results */}
      {results.length > 0 && (
        <div className="max-h-60 space-y-2 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">Command Results</h3>
            <Button onClick={clearResults} variant="outline" size="sm" className="gap-2 bg-transparent">
              <X className="h-3 w-3" />
              Clear
            </Button>
          </div>
          <div className="space-y-2">
            {results.slice(-10).map((result) => (
              <Card key={result.commandId} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatTimestamp(result.timestamp)}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          result.success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {result.success ? "Success" : "Error"}
                      </span>
                    </div>
                    <Button onClick={() => copyResult(result)} variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {copiedResults.has(result.commandId) ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    <span className="text-primary">{">"}</span> {result.command}
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs bg-muted/50 p-2 rounded">
                    {result.result}
                  </pre>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Command History */}
      {showHistory && commandHistory.length > 0 && (
        <Card className="p-2">
          <div className="max-h-40 space-y-1 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-card-foreground">Command History</span>
              <Button onClick={() => setShowHistory(false)} variant="ghost" size="sm" className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
            {commandHistory.slice(0, 10).map((cmd, index) => (
              <button
                key={index}
                onClick={() => selectHistoryCommand(cmd)}
                className="w-full rounded px-2 py-1 text-left font-mono text-xs hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
              >
                {cmd}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Command Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="Enter JavaScript command (e.g., document.title, window.location.href)"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="font-mono pr-10"
          />
          {commandHistory.length > 0 && (
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
            >
              <History className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button
          onClick={executeCommand}
          disabled={!command.trim() || !ws || pendingCommands.size > 0}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Execute
        </Button>
      </div>

      {/* Pending Commands Indicator */}
      {pendingCommands.size > 0 && (
        <div className="text-center">
          <span className="text-xs text-muted-foreground">
            Executing {pendingCommands.size} command{pendingCommands.size > 1 ? "s" : ""}...
          </span>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Tips:</strong> Use ↑/↓ arrows for command history, Enter to execute, Escape to close history
        </p>
        <p>
          <strong>Examples:</strong> document.title, window.location.href, localStorage.getItem('key'),
          document.querySelectorAll('div').length
        </p>
      </div>
    </div>
  )
}
