// Floor plane below the logo. textureMatrix (from Reflector) maps it onto the mirror image.
uniform mat4 textureMatrix;

varying vec4 vReflectUv;
varying vec3 vWorld;

void main() {
  vReflectUv = textureMatrix * vec4(position, 1.0);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
