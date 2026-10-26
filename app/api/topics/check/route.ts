import { errorResponse, readJson } from "@/server/ai/http";
import { ensureFresh } from "@/server/feeds/ingest";
import { FEEDS } from "@/server/feeds/registry";
import { feedStatuses } from "@/server/store";
import { buildCheckResponse, parseTopicRequest } from "@/server/topic-check";

/**
 * Manual topic check, triggered by a click. Refreshes feeds under the normal
 * refresh interval, then searches the stored articles. It knows nothing about
 * the reader's baseline: the browser compares results with what it has seen.
 */
export async function POST(request: Request) {
  try {
    const { topic, category } = parseTopicRequest(await readJson(request));
    await ensureFresh();
    return Response.json(buildCheckResponse(topic, category, feedStatuses(FEEDS), new Date()));
  } catch (err) {
    return errorResponse(err);
  }
}
