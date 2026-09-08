import {
  getMarkdownResponse,
  getPublishedMarkdownPaths,
} from "../../utils/markdownEndpoint";

export const getStaticPaths = getPublishedMarkdownPaths;

export async function GET({ params }: { params: { slug: string } }) {
  return getMarkdownResponse(params.slug);
}
