import { Context } from "hono";
import { SSEStreamingApi } from "hono/streaming";

export const getStream = (c: Context<any>) => {
  /**
   * Bun Stream - Required because stream.abort is not called otherwise
   * and the check for handling client aborts runs for bun only
   * https://github.com/honojs/hono/blob/091ecb7e867e958d48d7734029b196f654f16d14/src/helper/streaming/sse.ts#L75-L81
   */

  const { readable, writable } = new TransformStream();
  const stream = new SSEStreamingApi(writable, readable);

  c.req.raw.signal.addEventListener("abort", () => {
    if (!stream.closed) {
      stream.abort();
    }
  });

  c.header("Transfer-Encoding", "chunked");
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  return stream;
};

export const returnStream = (c: Context<any>, stream: SSEStreamingApi) => {
  return c.newResponse(stream.responseReadable);
};
