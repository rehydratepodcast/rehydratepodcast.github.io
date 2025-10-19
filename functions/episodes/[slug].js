export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Get object key relative to R2
  const objectKey = url.pathname.replace(/^\/episodes\//, "");

  // Only handle MP3s
  if (!objectKey.endsWith(".mp3")) {
    return context.next(); // fallback to Pages site
  }

  const rangeHeader = request.headers.get("range");
  let status = 200;
  let object;
  const headers = new Headers();

  try {
    if (rangeHeader) {
      // Parse "bytes=start-end"
      const matches = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (matches) {
        const start = matches[1] ? parseInt(matches[1], 10) : 0;
        const end = matches[2] ? parseInt(matches[2], 10) : undefined;

        // Fetch range from R2
        object = await env.PODCAST_BUCKET.get(objectKey, {
          range: end !== undefined ? `bytes=${start}-${end}` : `bytes=${start}-`,
        });

        if (!object) throw new Error("Not found");

        const objectSize = object.size ?? 0;
        status = 206; // Partial content
        headers.set(
          "Content-Range",
          `bytes ${start}-${end ?? objectSize - 1}/${objectSize}`
        );
      } else {
        object = await env.PODCAST_BUCKET.get(objectKey);
      }
    } else {
      // Full file if no range requested
      object = await env.PODCAST_BUCKET.get(objectKey);
    }

    if (!object) return new Response("MP3 not found in R2", { status: 404 });

    // Standard headers
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-type", "audio/mpeg");
    headers.set("cache-control", "public, max-age=3600");

    return new Response(object.body, { headers, status });
  } catch (err) {
    return new Response("Error fetching MP3", { status: 500 });
  }
}
