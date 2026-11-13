// A media plane in pixel space (orthographic camera). It bends while the page scrolls: the
// middle lags behind the edges, as if the image were flexible.
uniform float uBend; // in plane heights; sign follows the scroll direction
uniform float uViewportHeight; // CSS pixels

varying vec2 vUv;
varying float vScreenY; // 0 at the top of the screen, 1 at the bottom

void main() {
  vUv = uv;
  vec3 pos = position;
  pos.y += sin(uv.x * 3.14159265) * uBend;
  vec4 world = modelMatrix * vec4(pos, 1.0);
  // The scene's y axis points up with the top of the page at 0
  vScreenY = -world.y / max(uViewportHeight, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
}
