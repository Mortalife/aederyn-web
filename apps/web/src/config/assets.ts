import { isProduction } from "../lib/runtime.js";

export const getPublicPath = (path: string) => {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return `${isProduction() ? "/assets" : ""}${path}`;
};

export const textureMap: Record<string, string> = {
  tree: "/textures/tree-texture.webp",
  grass: "/textures/grass-texture.webp",
  water: "/textures/water-texture.webp",
  cliff: "/textures/cliff-texture.webp",
  camp: "/textures/camp-texture.webp",
  settlement: "/textures/settlement-texture.webp",
  bridge: "/textures/bridge-texture.webp",
};
