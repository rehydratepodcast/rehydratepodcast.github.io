export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const objectKey = url.pathname.replace(/^\/episodes\//, "");

  if (!objectKey || !objectKey.endsWith(".mp3")) return context.next();

  const rangeHeader = request.headers.get("range");
  let status = 200;
  const headers = new Headers();

  try {
    // First, get object metadata to know size
    const head = await env.PODCAST_BUCKET.head(objectKey);
    if (!head) return new Response("MP3 not found", { status: 404 });

    const objectSize = head.size;

    let object;

    if (rangeHeader) {
      const matches = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (matches) {
        const start = matches[1] ? parseInt(matches[1], 10) : 0;
        const end = matches[2] ? parseInt(matches[2], 10) : objectSize - 1;
        const length = end - start + 1;

        object = await env.PODCAST_BUCKET.get(objectKey, {
          range: { offset: start, length }
        });

        status = 206;
        headers.set("Content-Range", `bytes ${start}-${end}/${objectSize}`);
        headers.set("Accept-Ranges", "bytes");
      } else {
        object = await env.PODCAST_BUCKET.get(objectKey);
        headers.set("Accept-Ranges", "bytes");
      }
    } else {
      object = await env.PODCAST_BUCKET.get(objectKey);
      headers.set("Accept-Ranges", "bytes");
    }

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
