// A project panel on the Work page ring. Panels curve very slightly inwards, as if cut from
// the inside of a cylinder.
uniform float uCurve;

varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float x = uv.x - 0.5;
  pos.z += -x * x * uCurve;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
