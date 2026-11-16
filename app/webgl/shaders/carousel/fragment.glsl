// A Work page panel: the project card seen through fluted glass, a faint neural-network
// pattern in the project's domain colour, a glowing rim in that colour, and side effects
// (pixel mosaic, colour split, dimming) that grow as the panel turns away from the centre.
// The reflection copy fades out downwards. Colours are linear; three.js converts the output.
uniform sampler2D uMap;
uniform vec3 uDomain;       // domain glow colour
uniform vec2 uSize;         // panel size in world units
uniform float uActive;      // 1 when centred, 0 one step or more away
uniform float uHover;
uniform float uTime;
uniform float uFade;        // panel opacity (edges of the arc, filters, exit)
uniform float uReflection;  // 1 for the floor reflection copy
uniform float uRippleTime;
uniform vec2 uPointer;      // pointer on the panel, 0..1
uniform float uDetail;      // 0 on Low quality: no neural pattern or mosaic

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float roundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

vec2 node(vec2 cell) {
  return cell + 0.2 + 0.6 * vec2(hash(cell), hash(cell + 7.1));
}

// Nodes on a jittered grid, each linked to its right and upper neighbour; a pulse travels
// through the links
float neural(vec2 uv) {
  vec2 g = uv * vec2(5.0, 6.25);
  vec2 c = floor(g);
  float v = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 cell = c + vec2(float(x), float(y));
      vec2 n = node(cell);
      v = max(v, smoothstep(0.07, 0.0, length(g - n)));
      float pulse = 0.5 + 0.5 * sin(uTime * 1.5 + hash(cell) * 6.28);
      v = max(v, smoothstep(0.022, 0.0, segment(g, n, node(cell + vec2(1.0, 0.0)))) * 0.55 * pulse);
      v = max(v, smoothstep(0.022, 0.0, segment(g, n, node(cell + vec2(0.0, 1.0)))) * 0.55 * pulse);
    }
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float side = 1.0 - uActive;
  vec2 aspect = vec2(uSize.x / uSize.y, 1.0);

  // Hover ripple on the panel (a ring spreading from the pointer) with a lens bulge
  vec2 d = (uv - uPointer) * aspect;
  float dist = length(d);
  float front = min(uRippleTime * 0.8, 1.4);
  float wave = sin(dist * 30.0 - uRippleTime * 7.0) * exp(-dist * 4.0) * smoothstep(front + 0.02, front - 0.12, dist) * uHover;
  vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
  uv -= dir / aspect * wave * 0.014;
  float lens = exp(-dist * dist * 10.0) * 0.1 * uHover;
  uv = uPointer + (uv - uPointer) * (1.0 - lens);

  // Fluted glass: thin vertical ridges that bend the image sideways
  float flutes = 24.0;
  float f = fract(uv.x * flutes);
  // Calm on the centred panel so its text stays crisp; stronger as panels turn away
  uv.x += (f - 0.5) / flutes * (0.08 + 0.5 * side);

  // Side panels break into a pixel mosaic
  if (side > 0.05 && uDetail > 0.5) {
    float blocks = mix(220.0, 26.0, side);
    vec2 grid = vec2(blocks * aspect.x, blocks);
    uv = (floor(uv * grid) + 0.5) / grid;
  }

  float split = 0.0006 + side * 0.012 + abs(wave) * 0.006;
  vec3 color = vec3(
    texture2D(uMap, uv + vec2(split, 0.0)).r,
    texture2D(uMap, uv).g,
    texture2D(uMap, uv - vec2(split, 0.0)).b
  );

  // Ridge shading
  color *= 1.0 - 0.2 * pow(abs(f - 0.5) * 2.0, 2.0);

  // Neural pattern in the domain colour, fading on the centred panel
  if (uDetail > 0.5) {
    float n = neural(vUv + vec2(0.0, uTime * 0.01));
    color = mix(color, uDomain, n * 0.3 * (1.0 - uActive * 0.75));
  }

  // Centred panel bright, others dimmed; ripple crests catch the domain colour
  color *= mix(0.42, 1.0, uActive) * (1.0 + uHover * 0.12 + lens * 0.4);
  color = mix(color, uDomain, max(wave, 0.0) * 0.25);

  // Rim glow in the domain colour
  vec2 p = (vUv - 0.5) * uSize;
  float radius = 0.12;
  float edge = roundedBox(p, uSize * 0.5, radius);
  float rim = exp(-abs(edge) * 26.0);
  color += uDomain * rim * (0.35 + 0.9 * uActive + 0.6 * uHover);

  float alpha = (1.0 - smoothstep(-0.006, 0.0, edge)) * uFade;
  // The reflection is strongest at the floor line and fades away below it
  if (uReflection > 0.5) {
    alpha *= (1.0 - smoothstep(0.0, 0.45, vUv.y)) * 0.32;
    color *= 0.8;
  }

  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
