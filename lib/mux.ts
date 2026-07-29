import "server-only";
import Mux from "@mux/mux-node";

export function createMuxClient() {
  return new Mux({
    tokenId: process.env.MUX_TOKEN_ID!,
    tokenSecret: process.env.MUX_TOKEN_SECRET!,
    jwtSigningKey: process.env.MUX_SIGNING_KEY_ID,
    jwtPrivateKey: process.env.MUX_SIGNING_KEY_PRIVATE_KEY,
  });
}

export async function signPlaybackToken(playbackId: string) {
  const mux = createMuxClient();
  return mux.jwt.signPlaybackId(playbackId, {
    type: "video",
    expiration: "6h",
  });
}

export async function signThumbnailToken(playbackId: string) {
  const mux = createMuxClient();
  return mux.jwt.signPlaybackId(playbackId, {
    type: "thumbnail",
    expiration: "6h",
  });
}
