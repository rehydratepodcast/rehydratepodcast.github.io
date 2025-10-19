export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Get object key relative to R2
  const objectKey = url.pathname.replace(/^\/episodes\//, "");

  if (!objectKey) {
    console.error("Empty object key from URL:", url.pathname);
    return new Response("Invalid request", { status: 400 });
  }

  // Only handle MP3s
  if (!objectKey.endsWith(".mp3")) {
    return context.next(); // fallback to Pages site
  }

  const rangeHeader = request.headers.get("range");
  let status = 200;
  let object;
  const headers = new Headers();

  try {
    // Fetch object from R2
    object = await env.PODCAST_BUCKET.get(objectKey);
    if (!object) {
      console.warn("MP3 not found in R2:", objectKey);
      return new Response("MP3 not found in R2", { status: 404 });
    }

    const objectSize = object.size ?? (await env.PODCAST_BUCKET.head(objectKey)).size;

    if (rangeHeader) {
      // Parse "bytes=start-end"
      const matches = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (matches) {
        const start = matches[1] ? parseInt(matches[1], 10) : 0;
        const end = matches[2] ? parseInt(matches[2], 10) : objectSize - 1;

        // Fetch only the requested range
        object = await env.PODCAST_BUCKET.get(objectKey, {
          range: `bytes=${start}-${end}`,
        });

        status = 206; // Partial Content
        headers.set("Content-Range", `bytes ${start}-${end}/${objectSize}`);
        headers.set("Accept-Ranges", "bytes");
      }
    } else {
      headers.set("Accept-Ranges", "bytes");
    }

    // Standard headers
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-type", "audio/mpeg");
    headers.set("cache-control", "public, max-age=3600");

    return new Response(object.body, { headers, status });
  } catch (err) {
    console.error("Error fetching MP3:", objectKey, err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
