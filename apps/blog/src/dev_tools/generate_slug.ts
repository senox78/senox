const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

export const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

type SlugContext = {
  title: string;
  description?: string;
  content?: string;
};

export const generateSlugFromGemini = async ({
  title,
  description = "",
  content = "",
}: SlugContext) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    fail("GEMINI_API_KEY is required to generate a slug.");
  }

  const model = "gemini-3.5-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const context = [
    `Title: ${title}`,
    description ? `Description: ${description}` : "",
    content ? `Article:\n${content}` : "",
  ].filter(Boolean);
  const prompt = [
    "Generate a concise URL slug in lowercase ASCII for the blog article below.",
    "Use only letters a-z, numbers 0-9, and hyphens. Return ONLY the slug.",
    "If the article isn’t in English, translate its main idea naturally and generate a slug.",
    ...context,
  ].join("\n\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 24 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    fail(
      `Gemini API request failed: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const rawSlug = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  const generatedSlug = rawSlug ?? fail("Gemini API returned an empty slug.");
  const normalized = normalizeSlug(generatedSlug);

  if (!normalized || !/^[a-z0-9_-]+$/.test(normalized)) {
    fail(`Gemini API returned an invalid slug: ${rawSlug}`);
  }

  return normalized;
};
