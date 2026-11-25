# Aryan Singh — Portfolio

The portfolio of Aryan Singh, Full Stack Developer and AI/ML Engineer: a scroll-driven 3D experience built with Nuxt, Vue and three.js.

**Live site:** https://aryansingh7.netlify.app

## Features

- **3D home hero:** five scroll-driven scenes where particles simulated on the graphics card morph between shapes over a night landscape made in Blender, with a mirror lake, fireflies and smoke that follows the pointer.
- **About page:** a scroll walk through a 3D room, from the hallway into the monitor.
- **Work page:** stacking project cards, a filterable project index, and a page for each project.
- **Contact page:** live local time, a sentence-style contact form (Netlify Forms) and every other channel.
- **Smoke portal** page transitions, light and dark themes, optional sound, and Auto/High/Medium/Low quality settings.
- **Accessible and resilient:** works without WebGL or JavaScript, and respects reduced motion.
- **Secure and searchable:** strict Content Security Policy and other security headers, structured data, social cards and a sitemap.

## Tech stack

| Area      | Tools                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------ |
| Framework | [Nuxt 4](https://nuxt.com), [Vue 3](https://vuejs.org), TypeScript                               |
| 3D        | [three.js](https://threejs.org), postprocessing, custom GLSL shaders                             |
| Motion    | [GSAP](https://gsap.com) (ScrollTrigger, SplitText), [Lenis](https://lenis.darkroom.engineering) |
| Content   | [Nuxt Content](https://content.nuxt.com) (JSON and Markdown in `content/`)                       |
| State     | Pinia                                                                                            |
| Hosting   | Netlify (static site, forms, headers)                                                            |

## Getting started

Requires **Node.js 26** (see `.nvmrc`).

```bash
npm install        # also copies the 3D model decoders into public/
npm run dev        # http://localhost:3000
```

## Scripts

| Command             | What it does                             |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Development server with live reload      |
| `npm run generate`  | Build the static site (`.output/public`) |
| `npm run preview`   | Preview the production build             |
| `npm run lint`      | Lint the code                            |
| `npm run typecheck` | Type-check every file                    |
| `npm run contrast`  | Check colour contrast in both themes     |

## Project structure

```
app/
  pages/          one file per address (/, /about, /work, /work/<project>, /contact)
  components/     Vue components (layout, sections, about, work, contact, ui…)
  composables/    shared logic (SEO, content loading, scroll pinning…)
  plugins/        start-up code (GSAP, smooth scroll, 3D engine, sound)
  stores/         shared app state (Pinia)
  webgl/          the three.js engine: world, particles, effects, shaders
  assets/styles/  design tokens, themes, typography
content/          all the text: profile, about, education, awards, projects
public/           models, images, audio, icons, resume
scripts/          helper scripts (decoders, contrast check, audio, nginx headers)
```

## Editing content

All text lives in `content/`, so changes never touch the code:

- `profile.json`: name, contact details, hero scenes
- `about.json`: the About page story
- `education.json`: education and certifications
- `recognition.json`: awards and event photos
- `projects/*.md`: one file per project

In headlines, `*word*` becomes the italic accent word.

## Deployment

The site is hosted on **Netlify** and connected to this repository: every push to `main` builds and goes live automatically (`netlify.toml`).

## Docker

A container image of the site is published to **GitHub Packages** for every release:

```bash
docker run -p 8080:8080 ghcr.io/aryansinghh07/aryan-version-2
```

Then open http://localhost:8080. The contact form only sends from the Netlify site.

## Contact

- Website: https://aryansingh7.netlify.app
- GitHub: [@AryanSinghh07](https://github.com/AryanSinghh07)
- LinkedIn: [thearyansingh07](https://www.linkedin.com/in/thearyansingh07)

© 2026 Aryan Singh. All rights reserved.
