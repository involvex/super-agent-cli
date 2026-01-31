// WebSocket connection
let ws = null;
let isConnected = false;

const messagesContainer = document.getElementById("messages");
const promptInput = document.getElementById("prompt-input");
const sendBtn = document.getElementById("send-btn");
const statusEl = document.getElementById("status");
const autocompleteEl = document.getElementById("autocomplete");
const fileTreeEl = document.getElementById("file-tree");
const sessionsListEl = document.getElementById("sessions-list");

// Slash commands
const SLASH_COMMANDS = [
  { cmd: "/chat", desc: "Manage chat sessions" },
  { cmd: "/config", desc: "Configure settings" },
  { cmd: "/models", desc: "Select AI model" },
  { cmd: "/provider", desc: "Select LLM provider" },
  { cmd: "/mcp", desc: "MCP server management" },
  { cmd: "/plugin", desc: "Plugin management" },
  { cmd: "/search", desc: "Search files/code" },
  { cmd: "/help", desc: "Show help" },
];

// Security: HTML escape utility to prevent XSS
function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") {
    return "";
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Connect to WebSocket
function connect() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    isConnected = true;
    updateStatus("Connected", "connected");
    sendBtn.disabled = false;

    // Load initial data
    requestFileTree();
    requestSessions();
  };

  ws.onclose = () => {
    isConnected = false;
    updateStatus("Disconnected - Retrying...", "disconnected");
    sendBtn.disabled = true;
    setTimeout(connect, 2000);
  };

  ws.onerror = error => {
    console.error("WebSocket error:", error);
    updateStatus("Connection error", "disconnected");
    // Check if we're on Firebase Hosting or similar static hosting
    // Firebase Hosting does NOT support WebSocket connections
    // Show disconnected mode after connection fails
    setTimeout(() => {
      if (!isConnected) {
        showDisconnectedMode();
      }
    }, 2000);
  };

  ws.onmessage = event => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };
}

/**
 * Show disconnected mode with helpful instructions
 * This is shown when the WebSocket connection fails, which happens on
 * Firebase Hosting and other static hosting providers that don't support WebSocket.
 */
function showDisconnectedMode() {
  isConnected = false;
  updateStatus("View-only mode - CLI not connected", "disconnected");

  // Check if banner already exists to avoid duplicates
  const existingBanner = document.querySelector(".disconnected-banner");
  if (existingBanner) {
    return;
  }

  // Show banner explaining the situation
  const banner = document.createElement("div");
  banner.className = "disconnected-banner";
  banner.innerHTML = `
    <div class="banner-content">
      <strong>📡 CLI Connection Required</strong>
      <p>This web interface is in view-only mode. For full functionality:</p>
      <ol>
        <li>Run <code>super-agent --web</code> in your project directory</li>
        <li>Open <a href="http://localhost:3000">http://localhost:3000</a></li>
      </ol>
      <p class="note">Note: This web interface on Firebase Hosting is for demonstration only.
      WebSocket connections are not supported on static hosting platforms.</p>
      <button class="dismiss-btn">Dismiss</button>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);

  // Add dismiss handler
  banner.querySelector(".dismiss-btn").addEventListener("click", () => {
    banner.remove();
  });

  // Disable interactive elements
  sendBtn.disabled = true;
  promptInput.disabled = true;
  promptInput.placeholder = "Connect to CLI to send messages...";

  // Add a message to the chat
  addMessage(
    "⚠️ WebSocket connection failed. This interface is running on a static hosting platform " +
      "that doesn't support WebSocket connections. Please run 'super-agent --web' locally " +
      "and connect to http://localhost:3000 for full functionality.",
    "error",
  );
}

// Update status indicator
function updateStatus(text, className = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${className}`;
}

// Show update banner
function showUpdateBanner(currentVersion, latestVersion) {
  const banner = document.createElement("div");
  banner.className = "update-banner";

  const span = document.createElement("span");
  span.textContent = `📦 Update available: ${currentVersion} → ${latestVersion}`;

  const button = document.createElement("button");
  button.textContent = "✕";
  button.onclick = () => banner.remove();

  banner.appendChild(span);
  banner.appendChild(button);
  document.body.insertBefore(banner, document.body.firstChild);
}

// Request file tree
function requestFileTree() {
  if (isConnected) {
    ws.send(JSON.stringify({ type: "get_file_tree" }));
  }
}

// Request sessions list
function requestSessions() {
  if (isConnected) {
    ws.send(JSON.stringify({ type: "list_sessions" }));
  }
}

// Switch session
function switchSession(sessionId) {
  if (isConnected) {
    ws.send(JSON.stringify({ type: "switch_session", sessionId }));
  }
}

// View file
function viewFile(filePath) {
  if (isConnected) {
    ws.send(JSON.stringify({ type: "get_file_content", path: filePath }));
  }
}

// Handle incoming messages
function handleMessage(data) {
  switch (data.type) {
    case "update_available":
      showUpdateBanner(data.currentVersion, data.latestVersion);
      break;
    case "file_tree":
      renderFileTree(data.tree);
      break;
    case "file_content":
      showFilePreview(data.path, data.content);
      break;
    case "sessions_list":
      renderSessions(data.sessions);
      break;
    case "session_switched":
      handleSessionSwitch(data.session);
      break;
    case "user_message":
      addMessage(data.content, "user");
      break;
    case "assistant_message":
      addMessage(data.content, "assistant");
      break;
    case "tool_call":
      addMessage(`🔧 ${data.tool}: ${data.content}`, "tool");
      break;
    case "tool_result":
      addMessage(`✅ ${data.tool}: ${data.content}`, "tool");
      break;
    case "error":
      addMessage(`❌ Error: ${data.content}`, "error");
      break;
    case "done":
      sendBtn.disabled = false;
      promptInput.disabled = false;
      updateStatus("Connected", "connected");
      break;
  }
}

// Render file tree
function renderFileTree(tree) {
  if (!tree || tree.length === 0) {
    fileTreeEl.innerHTML = '<p class="empty-state">No files indexed yet</p>';
    return;
  }

  const directories = tree.filter(f => f.isDirectory);
  const files = tree.filter(f => !f.isDirectory);

  let html = "";

  // Show directories first
  directories.slice(0, 50).forEach(dir => {
    const safeName = escapeHtml(dir.name);
    html += `
            <div class="file-item directory">
                📁 ${safeName}
            </div>
        `;
  });

  // Then files
  files.slice(0, 100).forEach(file => {
    const safeName = escapeHtml(file.name);
    const safePath = escapeHtml(file.path);
    html += `
            <div class="file-item" onclick="viewFile('${safePath}')">
                📄 ${safeName}
            </div>
        `;
  });

  fileTreeEl.innerHTML = html;
}

// Render sessions
function renderSessions(sessions) {
  if (!sessions || sessions.length === 0) {
    sessionsListEl.innerHTML = '<p class="empty-state">No saved sessions</p>';
    return;
  }

  let html = "";
  sessions.forEach(session => {
    const date = new Date(session.lastAccessed).toLocaleDateString();
    const safeName = escapeHtml(session.name);
    const safeId = escapeHtml(session.id);
    const safeCount = escapeHtml(String(session.messageCount || 0));
    const safeDate = escapeHtml(date);

    html += `
            <div class="session-item" onclick="switchSession('${safeId}')">
                <div class="session-name">${safeName}</div>
                <div class="session-meta">${safeCount} messages · ${safeDate}</div>
            </div>
        `;
  });

  sessionsListEl.innerHTML = html;
}

// Handle session switch
function handleSessionSwitch(session) {
  // Clear current messages
  messagesContainer.innerHTML = "";

  // Load session messages
  session.messages.forEach(msg => {
    addMessage(msg.content, msg.role);
  });

  updateStatus(`Session: ${session.name}`, "connected");
}

// Show file preview
function showFilePreview(path, content) {
  addMessage(`📄 ${path}:\n\`\`\`\n${content}\n\`\`\``, "assistant");
}

// Add message to chat
function addMessage(content, type) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${type}`;
  messageEl.textContent = content;
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Slash command autocomplete
function handleAutocomplete(input) {
  const value = input.trim();

  if (!value.startsWith("/")) {
    autocompleteEl.classList.add("hidden");
    return;
  }

  const query = value.toLowerCase();
  const matches = SLASH_COMMANDS.filter(cmd =>
    cmd.cmd.toLowerCase().startsWith(query),
  );

  if (matches.length === 0) {
    autocompleteEl.classList.add("hidden");
    return;
  }

  let html = "";
  matches.forEach((cmd, index) => {
    const safeCmd = escapeHtml(cmd.cmd);
    const safeDesc = escapeHtml(cmd.desc);
    html += `
            <div class="autocomplete-item" data-cmd="${safeCmd}" data-index="${index}">
                <strong>${safeCmd}</strong> - ${safeDesc}
            </div>
        `;
  });

  autocompleteEl.innerHTML = html;
  autocompleteEl.classList.remove("hidden");

  // Add click handlers
  autocompleteEl.querySelectorAll(".autocomplete-item").forEach(item => {
    item.addEventListener("click", () => {
      promptInput.value = item.dataset.cmd + " ";
      autocompleteEl.classList.add("hidden");
      promptInput.focus();
    });
  });
}

// Send message
function sendMessage() {
  const prompt = promptInput.value.trim();
  if (!prompt || !isConnected) {
    return;
  }

  ws.send(
    JSON.stringify({
      type: "prompt",
      content: prompt,
    }),
  );

  promptInput.value = "";
  autocompleteEl.classList.add("hidden");
  sendBtn.disabled = true;
  promptInput.disabled = true;
  updateStatus("Processing...", "");
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);

promptInput.addEventListener("input", e => {
  handleAutocomplete(e.target.value);
});

promptInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    // Check if autocomplete is visible
    if (!autocompleteEl.classList.contains("hidden")) {
      const firstItem = autocompleteEl.querySelector(".autocomplete-item");
      if (firstItem) {
        promptInput.value = firstItem.dataset.cmd + " ";
        autocompleteEl.classList.add("hidden");
        return;
      }
    }

    sendMessage();
  } else if (e.key === "Escape") {
    autocompleteEl.classList.add("hidden");
  }
});

document
  .getElementById("refresh-files")
  .addEventListener("click", requestFileTree);
document
  .getElementById("refresh-sessions")
  .addEventListener("click", requestSessions);

// Initialize connection
connect();
