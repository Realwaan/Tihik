import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";

import { requestSchema, SYSTEM_INSTRUCTION } from "./config";
import { buildLocalFallbackReply } from "./fallback";
import { callGemini, callNvidiaNemotron, callOpenAI } from "./providers";
import { buildOutOfScopeReply, isAssistantRequestInScope } from "./scope";
import { buildUserFinanceSnapshot } from "./snapshot";
import { tryExecuteTransactionCommand } from "./transaction-actions";

export async function POST(request: NextRequest) {
  try {
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const json = await request.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const inScope = isAssistantRequestInScope({
      message: parsed.data.message,
      history: parsed.data.history ?? [],
    });

    if (!inScope) {
      return NextResponse.json(
        {
          data: {
            reply: buildOutOfScopeReply(),
          },
        },
        { status: 200 }
      );
    }


    const session = await auth();
    const userName = session?.user?.name?.trim() || "there";

    const actionResult = await tryExecuteTransactionCommand({
      userId: session?.user?.id,
      message: parsed.data.message,
      preferredCurrency: parsed.data.preferredCurrency ?? "USD",
    });

    if (actionResult.handled) {
      return NextResponse.json(
        {
          data: {
            reply: actionResult.reply ?? "Done.",
          },
        },
        { status: 200 }
      );
    }

    let snapshotInstruction = "";

    if (session?.user?.id) {
      try {
        snapshotInstruction = await buildUserFinanceSnapshot(
          session.user.id,
          parsed.data.preferredCurrency
        );
      } catch (snapshotError) {
        console.error("Failed to build assistant snapshot", snapshotError);
      }
    }

    const systemText = `${SYSTEM_INSTRUCTION} The current user's name is ${userName}. Preferred display currency for this request is ${parsed.data.preferredCurrency ?? "USD"}. ${snapshotInstruction}`;

    if (nvidiaKey) {
      const nvidiaResult = await callNvidiaNemotron(
        nvidiaKey,
        systemText,
        parsed.data.history ?? [],
        parsed.data.message.slice(0, 800)
      );

      if (!("error" in nvidiaResult)) {
        return NextResponse.json(nvidiaResult, { status: 200 });
      }

      // If NVIDIA key is invalid, return directly so it is not masked by lower-priority providers.
      if (
        nvidiaResult.error.toLowerCase().includes("invalid") ||
        nvidiaResult.error.toLowerCase().includes("blocked")
      ) {
        return NextResponse.json(
          { error: nvidiaResult.error },
          { status: nvidiaResult.status }
        );
      }

      if (!openaiKey && !geminiKey) {
        return NextResponse.json(
          {
            data: {
              reply: buildLocalFallbackReply(
                parsed.data.message,
                snapshotInstruction,
                nvidiaResult.error
              ),
            },
          },
          { status: 200 }
        );
      }
    }

    if (openaiKey) {
      const openaiResult = await callOpenAI(
        openaiKey,
        systemText,
        parsed.data.history ?? [],
        parsed.data.message.slice(0, 800)
      );

      if (!("error" in openaiResult)) {
        return NextResponse.json(openaiResult, { status: 200 });
      }

      // If OpenAI key is invalid, return this directly so it is not masked by Gemini fallback errors.
      if (
        openaiResult.error.toLowerCase().includes("invalid") ||
        openaiResult.error.toLowerCase().includes("blocked")
      ) {
        return NextResponse.json(
          { error: openaiResult.error },
          { status: openaiResult.status }
        );
      }

      if (!geminiKey) {
        return NextResponse.json(
          {
            data: {
              reply: buildLocalFallbackReply(
                parsed.data.message,
                snapshotInstruction,
                openaiResult.error
              ),
            },
          },
          { status: 200 }
        );
      }
    }

    if (geminiKey) {
      const geminiResult = await callGemini(
        geminiKey,
        systemText,
        parsed.data.history ?? [],
        parsed.data.message.slice(0, 800)
      );

      if (!("error" in geminiResult)) {
        return NextResponse.json(geminiResult, { status: 200 });
      }

      return NextResponse.json(
        {
          data: {
            reply: buildLocalFallbackReply(
              parsed.data.message,
              snapshotInstruction,
              geminiResult.error
            ),
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        data: {
          reply: buildLocalFallbackReply(parsed.data.message, snapshotInstruction),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to handle assistant request", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
