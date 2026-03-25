"use client";

import { useState } from "react";
import { ChatDemo } from "@/components/chat-demo";
import { DesignDemo } from "@/components/design-demo";

type DemoView = "chat" | "design";

export function DemoHome() {
  const [view, setView] = useState<DemoView>("chat");

  return (
    <>
      <nav className="demo-nav">
        <button
          type="button"
          className={`nav-pill ${view === "chat" ? "active" : ""}`}
          onClick={() => setView("chat")}
        >
          Multimodal Chat
        </button>
        <button
          type="button"
          className={`nav-pill ${view === "design" ? "active" : ""}`}
          onClick={() => setView("design")}
        >
          Design Taste Eval
        </button>
      </nav>
      {view === "chat" ? <ChatDemo /> : <DesignDemo />}
    </>
  );
}
