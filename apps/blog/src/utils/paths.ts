const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Build an origin-relative URL that always includes Astro's configured base. */
export function blogPath(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
