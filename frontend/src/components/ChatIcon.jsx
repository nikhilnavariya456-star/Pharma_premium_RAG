import { useState } from "react";

export default function ChatIcon() {
  const [pulse, setPulse] = useState(true);

  return (
    <button
      className="chat-fab"
      onClick={() => {}}
      title="Chat with AI assistant"
      id="chat-fab-btn"
    >
      <div className="chat-fab-icon">💬</div>
    </button>
  );
}
