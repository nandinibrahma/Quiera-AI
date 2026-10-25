
/* ========================================
   QUIERA AI — CHAT FUNCTIONALITY
   File: script.js
======================================== */

const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

const welcomeScreen = document.getElementById("welcome-screen");
const messagesContainer = document.getElementById("messages-container");
const chatHistory = document.getElementById("chat-history");

const newChatButton = document.getElementById("new-chat");
const sidebar = document.getElementById("sidebar");
const openSidebarButton = document.getElementById("open-sidebar");
const closeSidebarButton = document.getElementById("close-sidebar");

let conversations = [];
let activeConversationId = null;
let isSending = false;

// ----------------------------------------
// Conversation helpers
// ----------------------------------------

function createConversation() {
  const conversation = {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: []
  };

  conversations.unshift(conversation);
  activeConversationId = conversation.id;

  renderHistory();
  renderMessages();
  input.focus();
}

function getActiveConversation() {
  return conversations.find(
    conversation => conversation.id === activeConversationId
  );
}

// ----------------------------------------
// Sidebar and chat history
// ----------------------------------------

function renderHistory() {
  chatHistory.replaceChildren();

  conversations.forEach(conversation => {
    const button = document.createElement("button");

    button.type = "button";
    button.className =
      conversation.id === activeConversationId ? "active" : "";

    button.textContent = conversation.title;
    button.title = conversation.title;

    button.addEventListener("click", () => {
      if (isSending) return;

      activeConversationId = conversation.id;

      renderHistory();
      renderMessages();

      sidebar.classList.remove("open");
    });

    chatHistory.appendChild(button);
  });
}

// ----------------------------------------
// Safe message rendering
// ----------------------------------------

function addMessage(role, content, options = {}) {
  const { loading = false, error = false } = options;

  const message = document.createElement("div");

  message.className = [
    "message",
    role,
    loading ? "loading" : "",
    error ? "error" : ""
  ].filter(Boolean).join(" ");

  const icon = document.createElement("div");
  icon.className = "role-icon";
  icon.setAttribute("aria-hidden", "true");

  icon.textContent = role === "user" ? "Y" : "✳";

  const messageContent = document.createElement("div");
  messageContent.className = "message-content";

  // Use textContent so messages cannot inject HTML or scripts.
  messageContent.textContent = content;

  message.append(icon, messageContent);
  messagesContainer.appendChild(message);

  return message;
}

// ----------------------------------------
// Display active conversation
// ----------------------------------------

function renderMessages() {
  messagesContainer.replaceChildren();

  const conversation = getActiveConversation();
  const hasMessages = Boolean(
    conversation && conversation.messages.length
  );

  welcomeScreen.style.display = hasMessages ? "none" : "block";
  messagesContainer.style.display = hasMessages ? "flex" : "none";

  if (conversation) {
    conversation.messages.forEach(message => {
      addMessage(message.role, message.content);
    });
  }

  scrollToLatest();
}

function scrollToLatest() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ----------------------------------------
// Send message to secure AI backend
// ----------------------------------------

async function sendMessage(rawText) {
  const text = rawText.trim();

  if (!text || isSending) return;

  if (!getActiveConversation()) {
    createConversation();
  }

  const conversation = getActiveConversation();

  isSending = true;
  sendButton.disabled = true;
  input.disabled = true;

  conversation.messages.push({
    role: "user",
    content: text
  });

  if (conversation.title === "New chat") {
    conversation.title =
      text.length > 32 ? text.slice(0, 32) + "..." : text;

    renderHistory();
  }

  input.value = "";
  input.style.height = "auto";

  welcomeScreen.style.display = "none";
  messagesContainer.style.display = "flex";

  addMessage("user", text);

  const loadingMessage = addMessage(
    "assistant",
    "Quiera is thinking...",
    { loading: true }
  );

  scrollToLatest();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: conversation.messages.slice(-20)
      })
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The server returned an invalid response. Check your backend."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed (${response.status}).`
      );
    }

    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("Quiera did not return a valid message.");
    }

    conversation.messages.push({
      role: "assistant",
      content: data.reply
    });

    loadingMessage.querySelector(".message-content").textContent =
      data.reply;

    loadingMessage.classList.remove("loading");
  } catch (error) {
    // Remove the failed user message from the conversation state.
    // The visible message remains so the user can see what they sent.
    conversation.messages.pop();

    loadingMessage.remove();

    addMessage(
      "assistant",
      `Sorry, something went wrong: ${error.message}\n\nPlease try again.`,
      { error: true }
    );

    console.error("Quiera AI chat error:", error);
  } finally {
    isSending = false;
    sendButton.disabled = false;
    input.disabled = false;

    input.focus();
    scrollToLatest();
  }
}

// ----------------------------------------
// Form submission
// ----------------------------------------

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});

// Enter sends; Shift + Enter inserts a new line.
input.addEventListener("keydown", event => {
  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing
  ) {
    event.preventDefault();
    form.requestSubmit();
  }
});

// Automatically resize the input.
input.addEventListener("input", () => {
  input.style.height = "auto";

  input.style.height =
    Math.min(input.scrollHeight, 180) + "px";
});

// ----------------------------------------
// Start a new conversation
// ----------------------------------------

newChatButton.addEventListener("click", () => {
  if (isSending) return;

  createConversation();
  sidebar.classList.remove("open");
});

// ----------------------------------------
// Suggested prompts
// ----------------------------------------

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    if (isSending) return;

    sendMessage(button.dataset.prompt);
  });
});

// ----------------------------------------
// Mobile sidebar
// ----------------------------------------

openSidebarButton?.addEventListener("click", () => {
  sidebar.classList.add("open");
});

closeSidebarButton?.addEventListener("click", () => {
  sidebar.classList.remove("open");
});

// ----------------------------------------
// Initialize Quiera AI
// ----------------------------------------

createConversation();

console.log("Quiera AI chat interface initialized.");
