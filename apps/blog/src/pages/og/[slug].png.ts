import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import sharp from "sharp";
import satori from "satori";
import {
  buildOgVNode,
  loadOgFonts,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
} from "../../utils/og";

export const prerender = true;
const BLOG_TITLE = "Compute on Snails";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts
    .filter((post) => post.data.published !== false)
    .map((post) => ({
      params: { slug: post.id.split("/")[0] },
      props: {
        title: post.data.title,
        description: post.data.description,
      },
    }));
}

export const GET: APIRoute = async ({ props }) => {
  const title = (props?.title as string | undefined) ?? BLOG_TITLE;
  const description = props?.description as string | undefined;
  const vnode = buildOgVNode(title, description);
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
