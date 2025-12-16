import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";

const TEXTURES_SOURCE = "textures";
const TEXTURES_OUTPUT = "public/textures";
const TARGET_SIZE = 256;
const WEBP_QUALITY = 80;

async function optimizeTextures() {
  console.log("🖼️  Texture Optimization Script");
  console.log("================================");
  console.log(`Source: ${TEXTURES_SOURCE}`);
  console.log(`Output: ${TEXTURES_OUTPUT}`);
  console.log(`Target size: ${TARGET_SIZE}x${TARGET_SIZE}`);
  console.log(`WebP quality: ${WEBP_QUALITY}`);
  console.log("");

  // Ensure output directory exists
  await mkdir(TEXTURES_OUTPUT, { recursive: true });

  // Get all PNG files from source
  const files = await readdir(TEXTURES_SOURCE);
  const pngFiles = files.filter((f) => f.endsWith(".png"));

  if (pngFiles.length === 0) {
    console.log(`No PNG files found in ${TEXTURES_SOURCE}`);
    return;
  }

  for (const file of pngFiles) {
    const inputPath = join(TEXTURES_SOURCE, file);
    const outputName = basename(file, ".png") + ".webp";
    const outputPath = join(TEXTURES_OUTPUT, outputName);

    try {
      const inputInfo = await sharp(inputPath).metadata();
      const inputSize = `${inputInfo.width}x${inputInfo.height}`;

      await sharp(inputPath)
        .resize(TARGET_SIZE, TARGET_SIZE, {
          fit: "cover",
          position: "center",
        })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outputPath);

      console.log(`✓ ${file} (${inputSize}) → ${outputName}`);
    } catch (err) {
      console.error(`✗ Failed to process ${file}:`, err);
    }
  }

  console.log("");
  console.log("✅ Optimization complete!");
}

optimizeTextures().catch(console.error);
