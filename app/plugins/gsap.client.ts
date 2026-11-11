import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { Observer } from 'gsap/Observer'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

// Registers every GSAP plugin once, before any component uses them.
export default defineNuxtPlugin({
  name: 'gsap',
  setup() {
    gsap.registerPlugin(ScrollTrigger, SplitText, Observer, Flip, ScrambleTextPlugin)
    gsap.defaults({ ease: 'power3.out', duration: 0.8 })
  },
})
