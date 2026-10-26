import { articleIdFromBody } from "@/server/ai/resolve";
import { clientId, errorResponse, readJson } from "@/server/ai/http";
import { runAiTask } from "@/server/ai";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const result = await runAiTask({ task: "brief", articleId: articleIdFromBody(body) }, clientId(request));
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
