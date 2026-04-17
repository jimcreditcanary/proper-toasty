import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, step, completed, verificationId } = body as {
      sessionId?: string;
      step?: string;
      completed?: boolean;
      verificationId?: string;
    };

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Upsert session with latest step progress
    const upsertData = {
      session_id: sessionId,
      updated_at: new Date().toISOString(),
      ...(step ? { last_step: step } : {}),
      ...(completed != null ? { completed } : {}),
      ...(verificationId ? { verification_id: verificationId } : {}),
    };

    await admin
      .from("lead_impressions")
      .upsert(upsertData as never, { onConflict: "session_id" });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH: Update costs for a wizard session (called by extraction/marketplace APIs) */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, extractionCost, marketplaceCost, propertyLookupCost } =
      body as {
        sessionId?: string;
        extractionCost?: number;
        marketplaceCost?: number;
        propertyLookupCost?: number;
      };

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch current costs to increment
    const { data: currentRow } = await admin
      .from("lead_impressions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    const cur = currentRow as unknown as Record<string, unknown> | null;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (extractionCost != null) {
      updates.extraction_cost = (Number(cur?.extraction_cost) || 0) + extractionCost;
    }
    if (marketplaceCost != null) {
      updates.marketplace_cost = (Number(cur?.marketplace_cost) || 0) + marketplaceCost;
    }
    if (propertyLookupCost != null) {
      updates.property_lookup_cost =
        (Number(cur?.property_lookup_cost) || 0) + propertyLookupCost;
    }

    await admin
      .from("lead_impressions")
      .update(updates as never)
      .eq("session_id", sessionId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
