// Particle physics, position pass (GPGPU): move by the velocity. w keeps the particle's hash.
uniform float uDelta;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  float k = clamp(uDelta * 60.0, 0.0, 3.0);
  gl_FragColor = vec4(pos.xyz + vel * k, pos.w);
}
