export async function streamMp3(request, env, objectKey, waitUntil) {
  const cache = caches.default;
  const url = new URL(request.url);
  const cacheKey = new Request(url.origin + '/' + objectKey);
  const rangeHeader = request.headers.get('range');

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const headers = new Headers();

  try {
    const head = await env.PODCAST_BUCKET.head(objectKey);
    if (!head) return new Response('MP3 not found', { status: 404 });

    const objectSize = head.size;
    let object;
    let status = 200;

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
        headers.set('Content-Range', `bytes ${start}-${end}/${objectSize}`);
        headers.set('Accept-Ranges', 'bytes');
      } else {
        object = await env.PODCAST_BUCKET.get(objectKey);
        headers.set('Accept-Ranges', 'bytes');
      }
    } else {
      object = await env.PODCAST_BUCKET.get(objectKey);
      headers.set('Accept-Ranges', 'bytes');
    }

    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('content-type', 'audio/mpeg');
    headers.set('cache-control', `public, max-age=${env.CACHE_MAX_AGE ?? 3600}`);

    const response = new Response(object.body, { headers, status });

    if (status === 200) {
      waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (err) {
    console.error('Error fetching MP3:', objectKey, err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
