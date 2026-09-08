const MARKDOWN_PATH = "/blog/md/me";

const CLI_USER_AGENT = /\b(?:curl|wget|httpie)\b/i;

function isCliRequest(request) {
  const accept = request.headers.get("Accept")?.toLowerCase();

  if (accept?.includes("text/html")) return false;
  if (accept?.includes("text/markdown") || accept?.includes("text/plain")) {
    return true;
  }

  return CLI_USER_AGENT.test(request.headers.get("User-Agent") ?? "");
}

export async function onRequest(context) {
  if (!isCliRequest(context.request)) return context.next();

  const markdownRequest = new Request(
    new URL(MARKDOWN_PATH, context.request.url),
  );
  const markdownResponse = await context.next(markdownRequest);

  if (!markdownResponse.ok) return markdownResponse;

  const headers = new Headers(markdownResponse.headers);
  headers.set("Content-Type", "text/markdown; charset=utf-8");

  return new Response(markdownResponse.body, {
    status: markdownResponse.status,
    headers,
  });
}
