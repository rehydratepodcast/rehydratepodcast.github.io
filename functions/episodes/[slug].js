export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Strip the "/episodes/" prefix to get the R2 object key
  const objectKey = url.pathname.replace(/^\/episodes\//, "");

  // Only proxy MP3s
  if (objectKey.endsWith(".mp3")) {
    const object = await env.PODCAST_BUCKET.get(objectKey);
    if (!object) return new Response("MP3 not found in R2", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-type", "audio/mpeg");
    headers.set("cache-control", "public, max-age=3600");

    return new Response(object.body, { headers });
  }

  // Fallback to Pages site
  return context.next();
}
