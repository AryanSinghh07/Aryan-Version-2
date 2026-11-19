// Lake: a rippling mirror in the theme's colours. Layered directional waves plus a few
// rings that spread and respawn bend the surface; the waves wobble the mirror image (High
// quality) and catch glints, and a fresnel blends the deep base colour toward the reflection
// at grazing angles. Waves are worked out in landscape metres (as in Blender). It fades out
// with distance so it melts into the sky. Colours are linear.
uniform sampler2D tDiffuse;    // mirror image (Reflector), or unused
uniform vec3 color;            // required by Reflector, unused
uniform float uReflect;        // 1 with a mirror image
uniform float uTime;
uniform float uOpacity;
uniform vec3 uFloor;           // reflection tint
uniform vec3 uDeep;            // deep water colour
uniform vec3 uSheen;
uniform vec3 uGlint;
uniform float uRipple;
uniform float uScale;          // world units per landscape metre
uniform vec3 uCenter;          // point under the logo

varying vec4 vReflectUv;
varying vec3 vWorld;

// One directional wave: its height derivative along x and z
vec2 dwave(vec2 p, vec2 dir, float lambda, float speed, float amp) {
  vec2 d = normalize(dir);
  float k = 6.2831853 / lambda;
  float ph = dot(d, p) * k - uTime * speed * k;
  return d * cos(ph) * k * amp;
}

float hash(float n) { return fract(sin(n) * 43758.5453); }

vec2 rings(vec2 p) {
  vec2 g = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float period = 5.0 + fi * 1.3;
    float t = uTime + fi * 2.1;
    float cycle = floor(t / period);
    float age = fract(t / period);
    vec2 c = vec2(0.0, -15.0) + (vec2(hash(cycle + fi * 7.1), hash(cycle * 1.7 + fi * 3.3)) - 0.5) * 44.0;
    vec2 v = p - c;
    float r = length(v) + 1e-4;
    float front = age * 14.0;
    float band = exp(-pow((r - front) * 0.9, 2.0));
    g += (v / r) * cos((r - front) * 3.0) * band * (1.0 - age) * 0.08;
  }
  return g;
}

void main() {
  float dist = length(vWorld.xz - uCenter.xz);
  float fade = 1.0 - smoothstep(6.0, 11.2, dist);

  // Landscape metres: x as is, z relative to the lake centre (0, -15)
  vec2 p = vec2(vWorld.x, vWorld.z) / uScale - vec2(0.0, 15.0);
  vec2 n = dwave(p, vec2(1.0, 0.3), 9.0, 1.2, 0.06)
         + dwave(p, vec2(0.7, -1.0), 5.5, 0.9, 0.04)
         + dwave(p, vec2(-0.4, 1.0), 3.2, 0.8, 0.025)
         + dwave(p, vec2(1.0, 1.0), 1.6, 0.6, 0.012)
         + dwave(p, vec2(-1.0, 0.2), 0.9, 0.5, 0.006)
         + rings(p);
  // Far away the ripples blur together
  float camDist = length(cameraPosition - vWorld) / uScale;
  float waveFade = mix(1.0, 0.35, smoothstep(10.0, 70.0, camDist));
  n *= waveFade;

  vec3 normal = normalize(vec3(-n.x, 1.0, -n.y));
  vec3 view = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(normal, view), 0.0), 2.5);

  // Without a mirror image (Medium and Low quality): a dim reflection of the sky, close to the
  // deep water colour, so the lake stays dark rather than turning pale at a glance
  vec3 refl = mix(uDeep, uFloor, 0.3);
  if (uReflect > 0.5) {
    vec4 uv = vReflectUv;
    uv.xy += n * uRipple * 4.0 * uv.w;
    refl = texture2DProj(tDiffuse, uv).rgb * uFloor;
  }
  vec3 c = mix(uDeep, refl, 0.45 + 0.55 * fres);
  // Sheen: brighter under the logo
  c = mix(c, uSheen, exp(-dist * 0.35) * 0.25);
  // Glints where the waves face the sky light
  vec3 h = normalize(view + normalize(vec3(0.3, 1.0, -0.6)));
  float spec = pow(max(dot(normal, h), 0.0), 180.0) * 0.6;
  c += uGlint * spec;

  gl_FragColor = vec4(c, fade * uOpacity);
  #include <colorspace_fragment>
}
