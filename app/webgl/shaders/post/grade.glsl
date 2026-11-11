// Colour grade per theme: contrast around mid-grey, saturation, a tint in the shadows and a
// lift that raises the darkest tones. Runs in linear colour, before the final sRGB conversion.
uniform float uLift;
uniform float uContrast;
uniform float uSaturation;
uniform vec3 uShadowTint;
uniform float uShadowTintAmount;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  const float pivot = 0.18;
  c = max((c - pivot) * uContrast + pivot, 0.0);

  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(luma), c, uSaturation);

  float shadows = 1.0 - smoothstep(0.0, 0.35, luma);
  c = mix(c, c * 0.6 + uShadowTint * 0.4, shadows * uShadowTintAmount);
  c += uLift * (1.0 - c);

  outputColor = vec4(c, inputColor.a);
}
