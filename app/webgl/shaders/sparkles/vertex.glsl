// Sparkles drift slowly through the world and twinkle; fireflies (aSeed.w > 1) are bigger,
// stay near the logo and float up and down.
uniform float uTime;
uniform float uSize;
uniform float uResolutionY;

// xyz: home position, w: random (+1 for fireflies)
attribute vec4 aSeed;

varying float vFirefly;
varying float vTwinkle;
varying float vRand;

void main() {
  float firefly = step(1.0, aSeed.w);
  float r = fract(aSeed.w);
  vec3 pos = aSeed.xyz;
  pos.x += sin(uTime * 0.11 + r * 6.28) * (0.6 + firefly * 0.4);
  pos.z += cos(uTime * 0.09 + r * 4.1) * (0.6 + firefly * 0.4);
  pos.y += sin(uTime * (0.25 + firefly * 0.35) + r * 9.0) * (0.25 + firefly * 0.45);

  vec4 view = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * view;
  float size = mix(0.7 + r * 0.8, 2.4 + r * 1.0, firefly);
  gl_PointSize = uSize * size * uResolutionY * projectionMatrix[1][1] * 0.5 / -view.z;

  vFirefly = firefly;
  vTwinkle = 0.45 + 0.55 * sin(uTime * (1.5 + r * 2.5) + r * 40.0);
  vRand = r;
}
