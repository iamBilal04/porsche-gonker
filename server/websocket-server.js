const express = require("express")
const { createServer } = require("http")
const { WebSocketServer } = require("ws")
const { v4: uuidv4 } = require("uuid")
const path = require("path")

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Store active sessions and connections
const sessions = new Map() // sessionId -> { clientWs, viewerWs, logs: [] }

// Serve static files
app.use(express.static("public"))

// Generate agent script with session ID
app.get("/agent.js", (req, res) => {
  const sessionId = req.query.session || uuidv4()

  const agentLoader = `(function(){var s=document.createElement("script");s.src="http://localhost:3001/agent-full.js?session=${sessionId}";document.head.appendChild(s);})();`

  res.setHeader("Content-Type", "application/javascript")
  res.send(agentLoader)
})

app.get("/agent-full.js", (req, res) => {
  const sessionId = req.query.session || uuidv4()

  const agentScript = `
(function() {
  const SESSION_ID = '${sessionId}';
  const WS_URL = 'ws://localhost:3001';
  
  let ws;
  let reconnectInterval;
  
  function connect() {
    ws = new WebSocket(WS_URL);
    
    ws.onopen = function() {
      console.log('[RemoteDebug] Connected to debug server');
      ws.send(JSON.stringify({
        type: 'client_connect',
        sessionId: SESSION_ID,
        url: window.location.href,
        userAgent: navigator.userAgent
      }));
      clearInterval(reconnectInterval);
    };
    
    ws.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'execute_command') {
          try {
            const result = eval(data.command);
            ws.send(JSON.stringify({
              type: 'command_result',
              sessionId: SESSION_ID,
              commandId: data.commandId,
              result: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
              success: true
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'command_result',
              sessionId: SESSION_ID,
              commandId: data.commandId,
              result: error.message,
              success: false
            }));
          }
        }
      } catch (e) {
        console.error('[RemoteDebug] Error processing message:', e);
      }
    };
    
    ws.onclose = function() {
      console.log('[RemoteDebug] Connection lost, attempting to reconnect...');
      reconnectInterval = setInterval(connect, 3000);
    };
    
    ws.onerror = function(error) {
      console.error('[RemoteDebug] WebSocket error:', error);
    };
  }
  
  // Intercept console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };
  
  function sendLog(level, args) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      ws.send(JSON.stringify({
        type: 'console_log',
        sessionId: SESSION_ID,
        level: level,
        message: message,
        timestamp: new Date().toISOString(),
        url: window.location.href
      }));
    }
  }
  
  console.log = function(...args) {
    originalConsole.log.apply(console, args);
    sendLog('log', args);
  };
  
  console.error = function(...args) {
    originalConsole.error.apply(console, args);
    sendLog('error', args);
  };
  
  console.warn = function(...args) {
    originalConsole.warn.apply(console, args);
    sendLog('warn', args);
  };
  
  console.info = function(...args) {
    originalConsole.info.apply(console, args);
    sendLog('info', args);
  };
  
  // Intercept unhandled errors
  window.addEventListener('error', function(event) {
    sendLog('error', [event.error?.message || event.message, event.filename + ':' + event.lineno]);
  });
  
  window.addEventListener('unhandledrejection', function(event) {
    sendLog('error', ['Unhandled Promise Rejection:', event.reason]);
  });
  
  // Start connection
  connect();
  
  console.log('[RemoteDebug] Agent loaded for session:', SESSION_ID);
})();
  `

  res.setHeader("Content-Type", "application/javascript")
  res.send(agentScript)
})

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("New WebSocket connection")

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString())

      switch (message.type) {
        case "client_connect":
          handleClientConnect(ws, message)
          break

        case "viewer_connect":
          handleViewerConnect(ws, message)
          break

        case "console_log":
          handleConsoleLog(message)
          break

        case "command_result":
          handleCommandResult(message)
          break

        case "execute_command":
          handleExecuteCommand(message)
          break
      }
    } catch (error) {
      console.error("Error processing message:", error)
    }
  })

  ws.on("close", () => {
    handleDisconnect(ws)
  })
})

function handleClientConnect(ws, message) {
  const { sessionId, url, userAgent } = message

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      clientWs: null,
      viewerWs: null,
      logs: [],
      clientInfo: { url, userAgent },
    })
  }

  const session = sessions.get(sessionId)
  session.clientWs = ws
  session.clientInfo = { url, userAgent }

  console.log(`Client connected for session: ${sessionId}`)

  // Notify viewer if connected
  if (session.viewerWs) {
    session.viewerWs.send(
      JSON.stringify({
        type: "client_status",
        sessionId,
        status: "online",
        clientInfo: session.clientInfo,
      }),
    )
  }
}

function handleViewerConnect(ws, message) {
  const { sessionId } = message

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      clientWs: null,
      viewerWs: null,
      logs: [],
      clientInfo: null,
    })
  }

  const session = sessions.get(sessionId)
  session.viewerWs = ws

  console.log(`Viewer connected for session: ${sessionId}`)

  // Send current logs to viewer
  ws.send(
    JSON.stringify({
      type: "logs_history",
      sessionId,
      logs: session.logs,
    }),
  )

  // Send client status
  ws.send(
    JSON.stringify({
      type: "client_status",
      sessionId,
      status: session.clientWs ? "online" : "offline",
      clientInfo: session.clientInfo,
    }),
  )
}

function handleConsoleLog(message) {
  const { sessionId } = message
  const session = sessions.get(sessionId)

  if (session) {
    session.logs.push(message)

    // Keep only last 1000 logs
    if (session.logs.length > 1000) {
      session.logs = session.logs.slice(-1000)
    }

    // Forward to viewer if connected
    if (session.viewerWs) {
      session.viewerWs.send(
        JSON.stringify({
          type: "new_log",
          ...message,
        }),
      )
    }
  }
}

function handleCommandResult(message) {
  const { sessionId } = message
  const session = sessions.get(sessionId)

  if (session && session.viewerWs) {
    session.viewerWs.send(
      JSON.stringify({
        type: "command_result",
        ...message,
      }),
    )
  }
}

function handleExecuteCommand(message) {
  const { sessionId } = message
  const session = sessions.get(sessionId)

  if (session && session.clientWs) {
    session.clientWs.send(
      JSON.stringify({
        type: "execute_command",
        ...message,
      }),
    )
  }
}

function handleDisconnect(ws) {
  // Find and clean up the disconnected connection
  for (const [sessionId, session] of sessions.entries()) {
    if (session.clientWs === ws) {
      session.clientWs = null
      console.log(`Client disconnected for session: ${sessionId}`)

      // Notify viewer
      if (session.viewerWs) {
        session.viewerWs.send(
          JSON.stringify({
            type: "client_status",
            sessionId,
            status: "offline",
          }),
        )
      }
    } else if (session.viewerWs === ws) {
      session.viewerWs = null
      console.log(`Viewer disconnected for session: ${sessionId}`)
    }

    // Clean up empty sessions
    if (!session.clientWs && !session.viewerWs) {
      sessions.delete(sessionId)
    }
  }
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`RemoteDebug server running on port ${PORT}`)
  console.log(`Agent script available at: http://localhost:${PORT}/agent.js?session=YOUR_SESSION_ID`)
})
