import "server-only";
import Mux from "@mux/mux-node";

export function createMuxClient() {
  return new Mux({
    tokenId: process.env.MUX_TOKEN_ID!,
    tokenSecret: process.env.MUX_TOKEN_SECRET!,
  });
}
