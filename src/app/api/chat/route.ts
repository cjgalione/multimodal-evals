import { NextResponse } from "next/server";
import { handleChatRequest } from "@/lib/server/chat-handler";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await handleChatRequest(body);
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}

