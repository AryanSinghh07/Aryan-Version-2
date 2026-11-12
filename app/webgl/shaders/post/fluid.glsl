// Composites the fluid smoke over the scene as a soft violet tint. The theme values ("#C9B8FF
// at 35%") are CSS-style, so the mix happens in sRGB like CSS blending, then goes back to
// linear. Density saturates gently instead of clipping, so thick smoke never turns flat.
uniform sampler2D uDye;
uniform vec3 uTint;
uniform float uOpacity;

vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
vec3 toLinear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float density = max(texture2D(uDye, uv).r, 0.0);
  float amount = (1.0 - exp(-density * 2.0)) * uOpacity;
  if (amount < 0.001) {
    outputColor = inputColor;
    return;
  }
  vec3 color = mix(toSrgb(inputColor.rgb), toSrgb(uTint), amount);
  outputColor = vec4(toLinear(color), inputColor.a);
}
