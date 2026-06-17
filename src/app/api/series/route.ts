import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadEngineInput } from "@/lib/load";
import { runDailyEngine } from "@/lib/engine";

// Daily engine time series (cash, inventory, capital, margin) for charts/reports.
export async function GET() {
  if (!getSession()) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const input = await loadEngineInput();
  return NextResponse.json({ series: runDailyEngine(input) });
}
