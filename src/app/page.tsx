"use client";

import { useState } from "react";
import { ChatDemo } from "@/components/chat-demo";
import { DesignDemo } from "@/components/design-demo";

type DemoTab = "chat" | "design";

export default function HomePage() {
  const [tab, setTab] = useState<DemoTab>("design");

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          padding: "1.2rem 1rem 0",
          maxWidth: "1040px",
          margin: "0 auto",
        }}
      >
        <button
          className={`btn${tab === "design" ? " primary" : ""}`}
          onClick={() => setTab("design")}
        >
          Design Agent Demo
        </button>
        <button
          className={`btn${tab === "chat" ? " primary" : ""}`}
          onClick={() => setTab("chat")}
        >
          Multimodal Chat Demo
        </button>
      </div>
      {tab === "design" ? <DesignDemo /> : <ChatDemo />}
    </>
  );
}
