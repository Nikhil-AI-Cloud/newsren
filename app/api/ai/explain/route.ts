import { AiError, runAiTask } from "@/server/ai";
import { articleIdFromBody } from "@/server/ai/resolve";
import { clientId, errorResponse, readJson } from "@/server/ai/http";

const AUDIENCES = ["student", "educator", "professional"] as const;

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const audience = AUDIENCES.find((a) => a === body.audience);
    if (!audience) throw new AiError("bad_request", "Choose Student, Educator, or Professional.", 400);
    const result = await runAiTask({ task: "explain", articleId: articleIdFromBody(body), audience }, clientId(request));
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
