uniform vec3 uColor;
/** Beam strength: about 0.75 at night, 0.18 by day */
uniform float uOpacity;

varying float vT;

// Bright at the lamp, fading out along the cone
void main() {
  // Clamped: pow() of a value even slightly below zero is NaN, and bloom would spread it over
  // the whole frame
  float a = pow(clamp(1.0 - vT, 0.0, 1.0), 2.2) * uOpacity;
  gl_FragColor = vec4(uColor * a, a);
}
