// One point per particle. Its position comes from the physics simulation texture (aRef is the
// particle's texel there); size is set in world units, so it looks the same at any resolution
// and shrinks with distance.
uniform sampler2D uPositions;
uniform float uSize;
uniform float uResolutionY;
uniform float uSparkRatio;

attribute vec2 aRef;
// x: random, y: size, z: colour mix
attribute vec3 aParams;

varying float vColorMix;
varying float vSpark;
varying float vCenter;   // 1 at the middle of the shape, 0 far out
varying float vDepthFade;
varying float vShade;     // per-disc lightness

void main() {
  vec3 pos = texture2D(uPositions, aRef).xyz;
  vec4 view = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = uSize * aParams.y * uResolutionY * projectionMatrix[1][1] * 0.5 / -view.z;

  vColorMix = aParams.z;
  vShade = fract(aParams.x * 13.37);
  vSpark = step(1.0 - uSparkRatio, fract(aParams.x * 7.31));
  vCenter = exp(-dot(pos, pos) * 0.45);
  vDepthFade = clamp(1.0 - (-view.z - 6.0) * 0.1, 0.5, 1.0);
}
