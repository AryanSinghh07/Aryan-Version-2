// Particle morph: each particle travels from its point in the old shape (aFrom) to its point
// in the new one (aTo). Each particle starts a little later than the last (aParams.z), bursts
// outward mid-flight, drifts on curl noise, and is pushed away from the pointer.
#import ../includes/curl.glsl;

attribute vec3 aFrom;
attribute vec3 aTo;
// x: random, y: size, z: delay, w: colour mix
attribute vec4 aParams;

uniform float uTime;
uniform float uProgress;
uniform float uDelaySpread;
uniform float uDrift;
uniform float uScatter;
uniform float uSize;
uniform float uResolutionY;
uniform vec3 uPointer;
uniform float uPointerRadius;
uniform float uPointerStrength;
uniform float uSparkRatio;

varying float vColorMix;
varying float vSpark;
varying float vDepthFade;

float easeInOutCubic(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

void main() {
  // Per-particle progress: later particles start later, everyone finishes at 1
  float delay = aParams.z * uDelaySpread;
  float p = easeInOutCubic(clamp((uProgress - delay) / (1.0 - uDelaySpread), 0.0, 1.0));
  vec3 pos = mix(aFrom, aTo, p);

  // Burst outward along curl noise mid-flight, plus a gentle constant drift
  float burst = sin(p * 3.14159265);
  vec3 flow = curlNoise(pos * 0.35 + vec3(uTime * 0.05, aParams.x, 0.0));
  pos += flow * (uDrift * (0.6 + aParams.x * 0.8) + burst * uScatter * (0.5 + aParams.x));

  vec4 world = modelMatrix * vec4(pos, 1.0);

  // Push particles away from the pointer (in world space, on the screen plane)
  vec2 away = world.xy - uPointer.xy;
  float dist = length(away);
  float push = smoothstep(uPointerRadius, 0.0, dist) * uPointerStrength;
  world.xy += (dist > 0.0001 ? away / dist : vec2(0.0)) * push;
  world.z += push * 0.6;

  vec4 view = viewMatrix * world;
  gl_Position = projectionMatrix * view;

  // Size in world units, so it looks the same at every resolution, smaller with distance
  gl_PointSize = uSize * aParams.y * uResolutionY * projectionMatrix[1][1] * 0.5 / -view.z;

  vColorMix = aParams.w;
  vSpark = step(1.0 - uSparkRatio, fract(aParams.x * 7.31));
  vDepthFade = clamp(1.0 - (-view.z - 6.0) * 0.12, 0.45, 1.0);
}
