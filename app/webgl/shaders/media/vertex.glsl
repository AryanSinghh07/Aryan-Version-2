// A media plane in pixel space (orthographic camera). It bends while the page scrolls: the
// middle lags behind the edges, as if the image were flexible.
uniform float uBend; // in plane heights; sign follows the scroll direction

varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  pos.y += sin(uv.x * 3.14159265) * uBend;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
