const fs = require('fs');
const { Jimp } = require('jimp'); // updated for Jimp v1+
// or const Jimp = require('jimp'); depending on the version installed

const PARTICLE_COUNT = 4000;

async function generateEarth() {
  let image;
  try {
    // Note: Jimp v1+ might require importing differently, 
    // let's try the common way that works with v0.x or jimp object
    const JimpModule = typeof Jimp === 'function' ? Jimp : (require('jimp').default || require('jimp'));
    image = await JimpModule.read('earth.png');
  } catch (err) {
    console.error("Error loading earth.png with Jimp:", err);
    return;
  }

  const width = image.bitmap.width;
  const height = image.bitmap.height;

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  let validPoints = 0;

  console.log(`Sampling ${PARTICLE_COUNT} points from ${width}x${height} map using Jimp...`);

  while (validPoints < PARTICLE_COUNT) {
    const phi = Math.acos(1 - 2 * Math.random());
    const theta = Math.random() * 2 * Math.PI;

    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.sin(phi) * Math.sin(theta);
    const z = Math.cos(phi);

    const u = 0.5 + (Math.atan2(z, x) / (2 * Math.PI));
    const v = 0.5 - (Math.asin(y) / Math.PI);

    const pixelX = Math.floor(u * width);
    const pixelY = Math.floor(v * height);

    if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
      // getColor returns hex 0xRRGGBBAA
      const hex = image.getPixelColor(pixelX, pixelY);
      // We can use Jimp's hex to RGBA
      const rgba = typeof image.constructor.intToRGBA === 'function' 
                   ? image.constructor.intToRGBA(hex)
                   : { r: (hex >> 24) & 255, g: (hex >> 16) & 255, b: (hex >> 8) & 255 }; // Fallback

      const r = rgba.r;
      const g = rgba.g;
      const b = rgba.b;

      const brightness = (r + g + b) / 3;

      if (brightness > 128) {
        positions[validPoints * 3] = x;
        positions[validPoints * 3 + 1] = y;
        positions[validPoints * 3 + 2] = z;
        validPoints++;
      }
    }
  }

  console.log("Successfully sampled 4000 points. Encoding to base64...");

  const buffer = Buffer.from(positions.buffer);
  const base64String = buffer.toString('base64');

  const output = {
    targetPositionsBase64: base64String
  };

  fs.writeFileSync('client/src/assets/earth.json', JSON.stringify(output));
  console.log("Saved to client/src/assets/earth.json!");
}

generateEarth().catch(console.error);
