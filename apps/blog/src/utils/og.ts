import { readFileSync } from "node:fs";
import path from "node:path";
import { html } from "satori-html";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_AUTHOR = "せの(senox78)";
export const OG_SITE_NAME = "Compute on Snails";

const OG_THEME = {
  background: {
    start: "#E4E8F8",
    middle: "#EEF1FD",
    end: "#F7EBF4",
  },
  card: {
    background: "#ffffff",
    border: "#E9DCEF",
  },
  text: {
    title: "#111111",
    description: "#555555",
    footer: "#666666",
  },
} as const;

const fontPath = path.resolve(
  process.cwd(),
  "src/assets/fonts/noto_sans/NotoSansJP-Bold.ttf",
);
const fontData = readFileSync(fontPath);

const ogFonts = [
  {
    name: "Noto Sans JP",
    data: fontData,
    weight: 700 as const,
    style: "normal" as const,
  },
];

export const loadOgFonts = () => ogFonts;

const wrapperStyle = `
  width:${OG_IMAGE_WIDTH}px;
  height:${OG_IMAGE_HEIGHT}px;
  display:flex;
  background:linear-gradient(135deg, ${OG_THEME.background.start}, ${OG_THEME.background.middle}, ${OG_THEME.background.end});
  font-family:'Noto Sans JP',sans-serif;
`;

const cardStyle = `
  margin:56px;
  flex:1;
  background:${OG_THEME.card.background};
  border-radius:36px;
  border:2px solid ${OG_THEME.card.border};
  display:flex;
  flex-direction:column;
  box-sizing:border-box;
  padding:64px;
`;

export const buildOgVNode = (title: string, description?: string) => {
  const safeTitle = title.trim() || OG_SITE_NAME;
  const safeDescription = description?.trim() ?? "";

  return html`
    <div style="${wrapperStyle}">
      <div style="${cardStyle}">
        <div
          style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:24px;"
        >
          <div
            style="font-size:64px;font-weight:700;line-height:1.25;color:${OG_THEME.text.title};word-break:break-word;white-space:pre-wrap;"
          >
            ${safeTitle}
          </div>

          <div
            style="display:${safeDescription ? "flex" : "none"};font-size:28px;font-weight:700;line-height:1.5;color:${OG_THEME.text.description};word-break:break-word;white-space:pre-wrap;"
          >
            ${safeDescription}
          </div>
        </div>

        <div
          style="display:flex;justify-content:space-between;align-items:flex-end;font-size:32px;font-weight:700;color:${OG_THEME.text.footer};"
        >
          <div>${OG_SITE_NAME}</div>
          <div>${OG_AUTHOR}</div>
        </div>
      </div>
    </div>
  `;
};
