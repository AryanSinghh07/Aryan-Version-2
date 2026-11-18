// Sky: a four-stop gradient from the horizon up (in dark mode, the Digital Atmosphere sky:
// mauve horizon, violet, deep plum, near-black), soft slow clouds in the surface colour, and a
// glow in the direction of the logo. Colours are linear.
#import ../includes/curl.glsl;

uniform vec3 uHorizon;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec3 uTop;
uniform vec3 uCloudColor;
uniform vec3 uGlow;
uniform vec3 uLogoDir;   // from the camera towards the logo
uniform float uTime;
uniform float uCloud;
uniform float uBlank;        // 0 → 1: fade to the flat page backdrop
uniform vec3 uBlankColor;    // cloud strength

varying vec3 vDir;

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v * 0.5 + 0.5;
}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  float t = clamp((h + 0.05) / 0.65, 0.0, 1.0);
  vec3 color = mix(uHorizon, uMid, smoothstep(0.0, 0.12, t));
  color = mix(color, uHigh, smoothstep(0.12, 0.45, t));
  color = mix(color, uTop, smoothstep(0.45, 1.0, t));

  // Clouds drift slowly; thicker towards the horizon, thin overhead and below
  vec3 q = dir * 2.6 + vec3(uTime * 0.012, 0.0, uTime * 0.007);
  float c = smoothstep(0.5, 0.82, fbm(q));
  c *= smoothstep(-0.25, 0.1, h) * (1.0 - smoothstep(0.45, 0.9, h));
  color = mix(color, uCloudColor, c * uCloud * 0.6);

  // Soft light behind the logo
  float g = pow(max(dot(dir, normalize(uLogoDir)), 0.0), 7.0);
  color = mix(color, uGlow, g * 0.5);

  // Past the hero's portal the new page sits on a flat, plain backdrop
  color = mix(color, uBlankColor, uBlank);

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
