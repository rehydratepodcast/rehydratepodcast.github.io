import { streamMp3 } from '../_stream-mp3.js';

export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);
  const objectKey = url.pathname.replace(/^\/episodes\//, '');

  if (!objectKey || !objectKey.endsWith('.mp3')) return context.next();

  return streamMp3(request, env, objectKey, waitUntil);
}
