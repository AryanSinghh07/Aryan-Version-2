// Sky dome: a large sphere around the camera, seen from inside. The direction of each point
// colours the sky, so turning the camera turns past the clouds.
varying vec3 vDir;

void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
