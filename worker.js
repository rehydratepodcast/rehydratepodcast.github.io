export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle /episodes/*.mp3 → R2 bucket
    if (path.startsWith("/episodes/") && path.endsWith(".mp3")) {
      let key;

      // Handle both routes:
      // /episodes/pronunciations/*.mp3
      // /episodes/*.mp3
      if (path.startsWith("/episodes/pronunciations/")) {
        key = "pronunciations/" + path.split("/episodes/pronunciations/")[1];
      } else {
        key = path.split("/episodes/")[1];
      }

      // Fetch from R2 bucket
      const object = await env.PODCAST_BUCKET.get(key);

      if (!object) {
        return new Response("Not found", { status: 404 });
      }

      // Prepare headers
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=3600"); // optional caching

      // Stream the MP3 directly from R2
      return new Response(object.body, { headers });
    }

    // For all other routes, fall back to static site (Cloudflare Pages)
    return env.ASSETS.fetch(request);
  },
};
