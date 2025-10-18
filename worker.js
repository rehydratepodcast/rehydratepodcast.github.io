export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/episodes/") && url.pathname.endsWith(".mp3")) {
      const key = url.pathname.replace(/^\/episodes\//, "");
      const object = await env.PODCAST_BUCKET.get(key);
      if (!object) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);

      return new Response(object.body, { headers });
    }

    // fallback to Pages
    return env.ASSETS.fetch(request);
  },
};
