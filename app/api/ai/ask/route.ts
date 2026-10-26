import { AiError, runAiTask } from "@/server/ai";
import { articleIdFromBody } from "@/server/ai/resolve";
import { clientId, errorResponse, readJson } from "@/server/ai/http";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (typeof body.question !== "string") throw new AiError("bad_request", "Enter a question.", 400);
    const articleId = typeof body.slug === "string" && body.slug ? articleIdFromBody(body) : undefined;
    const result = await runAiTask({ task: "ask", question: body.question, articleId }, clientId(request));
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
