import { NextResponse } from "next/server";
import { handleDesignAgentRequest } from "@/lib/server/design-agent-handler";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await handleDesignAgentRequest(body);
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
