// A project image (or its placeholder) with rounded corners, a water-ripple and lens bulge
// under the pointer, and a block glitch that only happens near the top and bottom of the
// screen while the page scrolls. Colours are linear; three.js converts the output.
uniform sampler2D uMap;      // project image
uniform float uHasImage;
uniform vec2 uImageSize;     // image pixels, for object-fit: cover
uniform sampler2D uLabel;    // placeholder text: red = number (primary), green = label (muted)
uniform vec2 uSize;          // plane size in CSS pixels
uniform float uRadius;       // corner radius in CSS pixels
uniform float uHover;
uniform float uGlitch;       // scroll speed, 0..1
uniform float uTime;
uniform vec2 uPointer;       // pointer on the plane, 0..1 (y up)
uniform float uRippleTime;   // seconds since the pointer entered the plane
uniform float uPointerSpeed; // 0..1
uniform float uEdgeZone;     // height of the glitch bands, as a share of the screen
uniform vec3 uSurface;
uniform vec3 uLavender;
uniform vec3 uPrimary;
uniform vec3 uMuted;
uniform vec3 uAccent;        // ripple crests catch a little of this colour

varying vec2 vUv;
varying float vScreenY;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float roundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// object-fit: cover
vec2 coverUv(vec2 uv, vec2 box, vec2 image) {
  float boxRatio = box.x / box.y;
  float imageRatio = image.x / image.y;
  vec2 scale = boxRatio > imageRatio ? vec2(1.0, imageRatio / boxRatio) : vec2(boxRatio / imageRatio, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

// CSS blends colours in sRGB, so the placeholder does too (then converts back to linear);
// blending in linear light would make the glows look much brighter than the HTML version
vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
vec3 toLinear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }

vec3 placeholder(vec2 uv) {
  // Same look as the CSS placeholder: two soft radial glows over the surface colour
  vec2 aspect = vec2(uSize.x / uSize.y, 1.0);
  vec3 color = toSrgb(uSurface);
  color = mix(color, toSrgb(uLavender), smoothstep(0.55, 0.0, distance(uv * aspect, vec2(0.7, 0.7) * aspect)) * 0.55);
  color = mix(color, toSrgb(uPrimary), smoothstep(0.5, 0.0, distance(uv * aspect, vec2(0.2, 0.1) * aspect)) * 0.35);
  return color; // sRGB
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uSize.x / uSize.y, 1.0);

  // --- Edge glitch: only inside bands at the top and bottom of the screen, scaled by how
  // fast the page scrolls. Blocks pixelate and shift sideways, colour channels split.
  float edgeDist = min(vScreenY, 1.0 - vScreenY);
  float band = 1.0 - smoothstep(0.0, uEdgeZone, edgeDist);
  float g = band * uGlitch;
  float split = 0.0;
  if (g > 0.002) {
    float tick = floor(uTime * 14.0);
    vec2 blocks = vec2(mix(40.0, 12.0, g) * aspect.x, mix(40.0, 12.0, g));
    vec2 cell = floor(uv * blocks);
    if (hash(cell + tick) < g * 0.9) {
      uv = (cell + 0.5) / blocks;
      uv.x += (hash(cell.yx + tick + 3.0) - 0.5) * 0.14 * g;
    }
    split = 0.014 * g;
  }

  // --- Hover ripple: a ring spreading from where the pointer entered (a stone in water),
  // fading with distance, plus a lens bulge right under the pointer
  vec2 d = (uv - uPointer) * aspect;
  float dist = length(d);
  float front = min(uRippleTime * 0.9, 1.4);
  float reach = smoothstep(front + 0.02, front - 0.12, dist);
  float strength = uHover * (0.6 + uPointerSpeed * 0.8);
  float wave = sin(dist * 34.0 - uRippleTime * 8.0) * exp(-dist * 4.5) * reach * strength;
  vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
  uv -= dir / aspect * wave * 0.012;
  float lens = exp(-dist * dist * 12.0) * 0.14 * uHover;
  uv = uPointer + (uv - uPointer) * (1.0 - lens);
  float chroma = split + abs(wave) * 0.005;

  // Hover: a gentle zoom
  vec2 zuv = (uv - 0.5) * (1.0 - uHover * 0.04) + 0.5;

  vec3 color;
  if (uHasImage > 0.5) {
    vec2 c = coverUv(zuv, uSize, uImageSize);
    color = vec3(
      texture2D(uMap, c + vec2(chroma, 0.0)).r,
      texture2D(uMap, c).g,
      texture2D(uMap, c - vec2(chroma, 0.0)).b
    );
  } else {
    color = placeholder(zuv);
    // Text sits on the layout, not the zoom, so it lines up with the page
    vec4 a = texture2D(uLabel, uv + vec2(chroma, 0.0));
    vec4 b = texture2D(uLabel, uv - vec2(chroma, 0.0));
    color = mix(color, toSrgb(uPrimary), a.r);
    color = mix(color, toSrgb(uLavender), max(b.r - a.r, 0.0) * 0.8);
    color = mix(color, toSrgb(uMuted), a.g);
    color = toLinear(color);
  }

  // Ripple crests catch the accent colour; the bulge brightens a touch
  color = mix(color, uAccent, max(wave, 0.0) * 0.22);
  color *= 1.0 + lens * 0.4;

  // Leaving the screen: cards darken a little in the edge bands
  color *= 1.0 - band * 0.22;

  // Rounded corners with a one-pixel soft edge
  vec2 p = (vUv - 0.5) * uSize;
  float boxD = roundedBox(p, uSize * 0.5, uRadius);
  float alpha = 1.0 - smoothstep(-1.0, 0.0, boxD);

  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
