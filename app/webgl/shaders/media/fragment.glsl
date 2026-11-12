// A project image (or its placeholder) with rounded corners, a slight zoom on hover, and an
// RGB block glitch while the page scrolls fast. Colours are linear; three.js converts the output.
uniform sampler2D uMap;      // project image
uniform float uHasImage;
uniform vec2 uImageSize;     // image pixels, for object-fit: cover
uniform sampler2D uLabel;    // placeholder text: red = number (primary), green = label (muted)
uniform vec2 uSize;          // plane size in CSS pixels
uniform float uRadius;       // corner radius in CSS pixels
uniform float uHover;
uniform float uGlitch;
uniform float uTime;
uniform vec3 uSurface;
uniform vec3 uLavender;
uniform vec3 uPrimary;
uniform vec3 uMuted;

varying vec2 vUv;

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

  // Glitch: horizontal bands jump sideways, changing a dozen times a second
  float tick = floor(uTime * 12.0);
  float band = floor(uv.y * 18.0);
  float hit = step(1.0 - uGlitch * 0.6, hash(vec2(band, tick)));
  uv.x += (hash(vec2(band, tick + 1.0)) - 0.5) * 0.08 * hit * uGlitch;
  float split = 0.008 * uGlitch;

  // Hover: a gentle zoom
  vec2 zuv = (uv - 0.5) * (1.0 - uHover * 0.06) + 0.5;

  vec3 color;
  if (uHasImage > 0.5) {
    vec2 c = coverUv(zuv, uSize, uImageSize);
    color = vec3(
      texture2D(uMap, c + vec2(split, 0.0)).r,
      texture2D(uMap, c).g,
      texture2D(uMap, c - vec2(split, 0.0)).b
    );
  } else {
    color = placeholder(zuv);
    // Text sits on the layout, not the zoom, so it lines up with the page
    vec4 a = texture2D(uLabel, uv + vec2(split, 0.0));
    vec4 b = texture2D(uLabel, uv - vec2(split, 0.0));
    color = mix(color, toSrgb(uPrimary), a.r);
    color = mix(color, toSrgb(uLavender), max(b.r - a.r, 0.0) * 0.8);
    color = mix(color, toSrgb(uMuted), a.g);
    color = toLinear(color);
  }

  // Rounded corners with a one-pixel soft edge
  vec2 p = (vUv - 0.5) * uSize;
  float d = roundedBox(p, uSize * 0.5, uRadius);
  float alpha = 1.0 - smoothstep(-1.0, 0.0, d);

  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
