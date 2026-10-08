import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Public pages only — account, admin and API routes stay out of the index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/dashboard", "/profile", "/settings", "/songbooks"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
