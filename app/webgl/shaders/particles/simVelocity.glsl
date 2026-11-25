// Particle physics, velocity pass (GPGPU). texturePosition, textureVelocity and resolution are
// provided by GPUComputationRenderer. Forces, in order: spring to the shape, damping, curl
// flow, breathing pulse, morph burst, then the pointer pushing and dragging particles.
#import ../includes/curl.glsl;

uniform sampler2D uTarget;   // home position on the current shape
uniform sampler2D uTargetB;  // home position on the next shape (the hero morphs as it scrolls)
uniform float uBlend;        // 0: the current shape, 1: the next one
uniform float uDelta;        // seconds since the last step
uniform float uTime;
uniform float uSpring;
uniform float uDamping;
uniform float uFlowStrength;
uniform float uFlowScale;
uniform float uFlowSpeed;
uniform float uPulse;
uniform float uBurst;        // outward push right after a morph starts
uniform float uMorphTime;    // seconds since the current morph started
uniform vec3 uPointer;       // pointer in particle space (far away when inactive)
uniform vec3 uPointerVelocity;
uniform float uPointerRadius;
uniform float uPointerStrength;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  float hash = pos.w;
  // Scroll-driven morph: each particle leaves at its own moment and loosens a little on the
  // way, so one shape flows into the next (kept light: a heavier swirl reads as a shapeless
  // blob for most of the hand-over)
  vec3 targetA = texture2D(uTarget, uv).xyz;
  vec3 targetB = texture2D(uTargetB, uv).xyz;
  float m = smoothstep(hash * 0.4, hash * 0.4 + 0.6, uBlend);
  vec3 target = mix(targetA, targetB, m);
  float loose = sin(m * 3.14159);
  target += curlNoise(target * 0.6 + vec3(hash * 4.0)) * loose * 0.25;
  // Steps are tuned per frame at 60 fps; scale them so any frame rate behaves the same
  float k = clamp(uDelta * 60.0, 0.0, 3.0);

  // Spring: softened right after a morph and ramped back up at a per-particle moment,
  // so particles leave and arrive one after another instead of all at once
  float start = hash * 0.5;
  float ramp = smoothstep(start, start + 1.0, uMorphTime);
  vec3 acc = (target - pos.xyz) * uSpring * mix(0.12, 1.0, ramp);

  // Curl flow: swirling drift that never clumps
  acc += curlNoise(pos.xyz * uFlowScale + vec3(0.0, uTime * uFlowSpeed, hash)) * uFlowStrength;

  // Breathing and burst, both outward from the centre
  float r = length(pos.xyz) + 0.0001;
  vec3 outward = pos.xyz / r;
  acc += outward * sin(uTime * 1.3 + hash * 6.2832) * uPulse;
  acc += outward * uBurst * (0.5 + hash);

  // Pointer: push away, stronger when the pointer moves fast, and drag along a little
  vec3 away = pos.xyz - uPointer;
  float d = length(away);
  float fall = 1.0 - smoothstep(0.0, uPointerRadius, d);
  acc += (away / (d + 0.0001)) * fall * uPointerStrength;
  acc += uPointerVelocity * fall * 0.3;

  vel = vel * pow(uDamping, k) + acc * k;
  gl_FragColor = vec4(vel, 1.0);
}
