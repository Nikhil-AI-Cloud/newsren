import { AiError, runAiTask } from "@/server/ai";
import { clientId, errorResponse, readJson } from "@/server/ai/http";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (typeof body.topic !== "string" || !Array.isArray(body.newIds)) throw new AiError("bad_request", "Missing topic or articles.", 400);
    const result = await runAiTask(
      { task: "updates", topic: body.topic, newIds: body.newIds as string[], seenIds: Array.isArray(body.seenIds) ? (body.seenIds as string[]) : [] },
      clientId(request),
    );
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
