export async function onRequest(context) {
  const { request, params, env } = context;

  // Reconstruct the path from slug array
  const filename = params.slug.join("/");

  // Only proxy MP3 files
  if (filename.endsWith(".mp3")) {
    // Determine R2 object key
    const objectKey = filename; // matches R2 path, e.g. "pronunciations/foo.mp3" or "episode1.mp3"

    // Fetch from R2
    const object = await env.PODCAST_BUCKET.get(objectKey);

    if (!object) {
      return new Response("MP3 not found in R2", { status: 404 });
    }

    // Set headers from R2 object
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-type", "audio/mpeg"); // optional but ensures correct type
    headers.set("cache-control", "public, max-age=3600");

    // Return MP3 stream
    return new Response(object.body, { headers });
  }

  // Non-MP3 fallback: serve Pages site
  return context.next();
}
