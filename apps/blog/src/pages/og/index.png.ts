import type { APIRoute } from "astro";
import sharp from "sharp";
import satori from "satori";
import {
  buildOgVNode,
  loadOgFonts,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
} from "../../utils/og";

export const prerender = true;

export const GET: APIRoute = async () => {
  const vnode = buildOgVNode("Compute on Snails");
  const svg = await satori(vnode, {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    fonts: loadOgFonts(),
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(Uint8Array.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
