// Chat webview script
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  fileContexts?: any[];
}

let messages: Message[] = [];
let isConnected = false;

// Initialize
window.addEventListener("load", () => {
  const promptInput = document.getElementById("prompt") as HTMLInputElement;
  const sendButton = document.getElementById("send") as HTMLButtonElement;
  const abortButton = document.getElementById("abort") as HTMLButtonElement;
  const mentionButton = document.getElementById(
    "mentionCurrent",
  ) as HTMLButtonElement;

  // Send message on Enter
  promptInput?.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendButton?.addEventListener("click", sendMessage);
  abortButton?.addEventListener("click", () => {
    vscode.postMessage({ type: "abort" });
  });

  mentionButton?.addEventListener("click", () => {
    vscode.postMessage({ type: "getFileContext" });
  });

  // Request file context on load
  vscode.postMessage({ type: "getFileContext" });
  vscode.postMessage({ type: "requestHistory" });
});

// Handle messages from extension
window.addEventListener("message", event => {
  const message = event.data;

  switch (message.type) {
    case "messages":
      messages = message.messages;
      renderMessages();
      break;

    case "connectionStatus":
      isConnected = message.connected;
      updateConnectionStatus();
      break;

    case "fileContext":
      updateFileContext(message.currentFile, message.openFiles);
      break;
  }
});

function sendMessage() {
  const promptInput = document.getElementById("prompt") as HTMLInputElement;
  const content = promptInput?.value.trim();

  if (content) {
    vscode.postMessage({ type: "sendMessage", content });
    promptInput.value = "";
    showAbortButton();
  }
}

function renderMessages() {
  const messagesContainer = document.getElementById("messages");
  if (!messagesContainer) {
    return;
  }

  messagesContainer.innerHTML = "";

  for (const message of messages) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${message.role}`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "content";

    if (message.role === "user") {
      contentDiv.textContent = message.content;
    } else {
      contentDiv.innerHTML = formatContent(message.content);
    }

    messageDiv.appendChild(contentDiv);

    // Add file contexts if present
    if (message.fileContexts && message.fileContexts.length > 0) {
      const filesDiv = document.createElement("div");
      filesDiv.className = "file-contexts";

      for (const fileCtx of message.fileContexts) {
        const fileSpan = document.createElement("span");
        fileSpan.className = "file-mention";
        fileSpan.textContent = `@${fileCtx.relativePath}`;
        filesDiv.appendChild(fileSpan);
      }

      messageDiv.appendChild(filesDiv);
    }

    messagesContainer.appendChild(messageDiv);
  }

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatContent(content: string): string {
  // Simple markdown-like formatting
  let formatted = content;

  // Code blocks
  formatted = formatted.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (match, lang, code) => {
      return `<pre><code class="language-${lang || "text"}">${escapeHtml(
        code.trim(),
      )}</code></pre>`;
    },
  );

  // Inline code
  formatted = formatted.replace(
    /`([^`]+)`/g,
    (match, code) => `<code>${escapeHtml(code)}</code>`,
  );

  // Bold
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic
  formatted = formatted.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Line breaks
  formatted = formatted.replace(/\n/g, "<br>");

  return formatted;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function updateConnectionStatus() {
  const statusElement = document.getElementById("status");
  if (statusElement) {
    statusElement.textContent = isConnected ? "Connected" : "Disconnected";
    statusElement.className =
      "status " + (isConnected ? "connected" : "disconnected");
  }
}

function updateFileContext(currentFile: any, openFiles: any[]) {
  const fileContextDiv = document.getElementById("fileContext");
  if (!fileContextDiv) {
    return;
  }

  fileContextDiv.style.display = openFiles.length > 0 ? "block" : "none";

  // Clear existing buttons
  const existingButtons = fileContextDiv.querySelectorAll("button");
  existingButtons.forEach(btn => btn.remove());

  // Add button for current file
  if (currentFile) {
    const button = document.createElement("button");
    button.textContent = `@ ${currentFile.relativePath}`;
    button.onclick = () => {
      const promptInput = document.getElementById("prompt") as HTMLInputElement;
      promptInput.value = `@${currentFile.relativePath} ${promptInput.value}`;
      promptInput.focus();
    };
    fileContextDiv.appendChild(button);
  }

  // Add buttons for open files (limit to 5)
  for (const file of openFiles.slice(0, 5)) {
    if (currentFile && file.relativePath === currentFile.relativePath) {
      continue; // Skip current file
    }

    const button = document.createElement("button");
    button.textContent = `@ ${file.relativePath}`;
    button.onclick = () => {
      const promptInput = document.getElementById("prompt") as HTMLInputElement;
      promptInput.value = `@${file.relativePath} ${promptInput.value}`;
      promptInput.focus();
    };
    fileContextDiv.appendChild(button);
  }
}

function showAbortButton() {
  const abortButton = document.getElementById("abort") as HTMLButtonElement;
  const sendButton = document.getElementById("send") as HTMLButtonElement;

  if (abortButton && sendButton) {
    abortButton.style.display = "inline-block";
    sendButton.style.display = "none";
  }

  // Hide abort button after 30 seconds (timeout)
  setTimeout(() => {
    abortButton.style.display = "none";
    sendButton.style.display = "inline-block";
  }, 30000);
}

// Expose functions globally for onclick attributes
(window as any).sendMessage = sendMessage;
