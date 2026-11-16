// Floor: a glossy surface in the theme's colours. With a mirror image (High quality) it shows
// a soft, slightly rippling reflection; otherwise a sheen under the logo stands in for one.
// It fades out with distance so it melts into the sky. Colours are linear.
uniform sampler2D tDiffuse;    // mirror image (Reflector), or unused
uniform vec3 color;            // required by Reflector, unused
uniform float uReflect;        // 1 with a mirror image
uniform float uTime;
uniform float uOpacity;
uniform vec3 uFloor;
uniform vec3 uSheen;
uniform vec3 uCenter;          // point under the logo

varying vec4 vReflectUv;
varying vec3 vWorld;

void main() {
  float dist = length(vWorld.xz - uCenter.xz);
  float fade = 1.0 - smoothstep(6.0, 11.2, dist);

  vec3 c = uFloor;
  // Sheen: brighter under the logo
  c = mix(c, uSheen, exp(-dist * 0.35) * 0.45);

  if (uReflect > 0.5) {
    // A gentle ripple wobbles the mirror image like still water
    vec2 wobble = vec2(
      sin(vWorld.x * 1.4 + uTime * 0.7) + sin(vWorld.z * 1.9 - uTime * 0.5),
      cos(vWorld.z * 1.3 + uTime * 0.6) + cos(vWorld.x * 1.7 - uTime * 0.4)
    ) * 0.006;
    vec4 uv = vReflectUv;
    uv.xy += wobble * uv.w;
    vec3 reflection = texture2DProj(tDiffuse, uv).rgb;
    c = mix(c, reflection, 0.42 * fade);
  }

  gl_FragColor = vec4(c, fade * uOpacity);
  #include <colorspace_fragment>
}
