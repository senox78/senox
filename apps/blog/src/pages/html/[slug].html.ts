import {
  getHtmlResponse,
  getPublishedHtmlPaths,
} from "../../utils/htmlEndpoint";

export const getStaticPaths = getPublishedHtmlPaths;

export async function GET({ params }: { params: { slug: string } }) {
  return getHtmlResponse(params.slug);
}
