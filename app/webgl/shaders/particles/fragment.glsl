// Each particle is drawn as a tiny lit sphere: a fake normal from the point coordinate,
// diffuse light, a specular glint, a cool/warm rim, and a glow near the centre of the shape
// that slowly pulses. Colours are linear; three.js converts the output.
uniform vec3 uColorA;      // the logo's three colours: about 55% of the balls,
uniform vec3 uColorB;      // 28%,
uniform vec3 uColorC;      // and 17%
uniform vec3 uSparkColor;  // accent sparks
uniform vec3 uRimCool;
uniform vec3 uRimWarm;
uniform vec3 uLightDir;    // in view space
uniform float uSpecular;
uniform float uGlow;       // centre glow strength
uniform float uTime;
uniform float uOpacity;
uniform float uIntensity;

varying float vColorMix;
varying float vSpark;
varying float vCenter;
varying float vDepthFade;

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  p.y = -p.y;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;

  vec3 n = vec3(p, sqrt(1.0 - r2));
  vec3 l = normalize(uLightDir);
  float diffuse = max(dot(n, l), 0.0);
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float glint = pow(max(dot(n, h), 0.0), 48.0);
  float rim = pow(1.0 - n.z, 2.2);

  vec3 base = vColorMix < 0.55 ? uColorA : (vColorMix < 0.83 ? uColorB : uColorC);
  base = mix(base, uSparkColor, vSpark);

  vec3 rimColor = mix(uRimCool, uRimWarm, clamp(n.x * 0.5 + 0.5, 0.0, 1.0));
  // Lit from the top left: a deep falloff to the shadowed side gives each ball real volume
  float shade = 0.2 + 0.95 * pow(diffuse, 1.15);
  vec3 color = base * shade + glint * uSpecular + rimColor * rim * 0.35;

  // Glowing core near the middle of the shape, breathing slowly
  float pulse = 0.75 + 0.25 * sin(uTime * 1.6);
  color += base * vCenter * uGlow * pulse;

  // A dark outline at the edge (a little contact shadow where balls overlap), so each ball
  // reads as a separate glossy bead
  color *= mix(1.0, 0.32, smoothstep(0.7, 1.0, r2));

  // A soft edge one pixel wide keeps the balls round without hard aliasing
  float edge = 1.0 - smoothstep(0.82, 1.0, r2);
  float alpha = edge * uOpacity * vDepthFade;
  gl_FragColor = vec4(color * uIntensity, alpha);
  #include <colorspace_fragment>
}
