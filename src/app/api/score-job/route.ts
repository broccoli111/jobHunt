import { NextRequest, NextResponse } from "next/server";
import { scoreJob, inferSeniority, inferRoleFocus, inferWorkMode } from "@/lib/scoring/job-scorer";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  location: z.string().optional(),
  remoteFilterActive: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);

    const workMode = inferWorkMode(parsed.location ?? "", parsed.description);
    const score = scoreJob({
      title: parsed.title,
      description: parsed.description,
      location: parsed.location,
      workMode,
      remoteFilterActive: parsed.remoteFilterActive ?? true,
    });

    return NextResponse.json({
      ...score,
      workMode,
      seniority: inferSeniority(parsed.title, parsed.description),
      roleFocus: inferRoleFocus(parsed.title, parsed.description),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Scoring failed" }, { status: 500 });
  }
}
