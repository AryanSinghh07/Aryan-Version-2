import {
  siCplusplus,
  siCss,
  siDocker,
  siExpress,
  siFastapi,
  siGit,
  siGithubactions,
  siGreensock,
  siHtml5,
  siHuggingface,
  siJavascript,
  siKubernetes,
  siLangchain,
  siMlflow,
  siMysql,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siOpenjdk,
  siOpencv,
  siPython,
  siPytorch,
  siReact,
  siRender,
  siScikitlearn,
  siTailwindcss,
  siTensorflow,
  siThreedotjs,
  siTypescript,
  siVercel,
} from 'simple-icons'

// Logos for the Stack section. Brand logos come from Simple Icons (CC0, one filled 24×24 path
// each, with the brand colour). Concepts without a logo (and AWS, which Simple Icons can't
// carry) use simple outline glyphs in the same 24×24 box.

export interface TechIcon {
  path: string
  /** Brand colour, or null to use the text colour (near-black brands, outline glyphs) */
  color: string | null
  /** Outline glyph (stroked) rather than a filled logo */
  outline?: boolean
}

type Brand = { path: string; hex: string }

/** Near-black brand colours would vanish on the dark theme: use the text colour instead */
function brand(icon: Brand): TechIcon {
  const n = parseInt(icon.hex, 16)
  const luma = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
  return { path: icon.path, color: luma < 40 ? null : `#${icon.hex}` }
}

const outline = (path: string): TechIcon => ({ path, color: null, outline: true })

const ICONS: Record<string, TechIcon> = {
  'React.js': brand(siReact),
  'Next.js': brand(siNextdotjs),
  'Three.js': brand(siThreedotjs),
  GSAP: brand(siGreensock),
  TypeScript: brand(siTypescript),
  JavaScript: brand(siJavascript),
  'Tailwind CSS': brand(siTailwindcss),
  HTML5: brand(siHtml5),
  CSS3: brand(siCss),
  Python: brand(siPython),
  'Node.js': brand(siNodedotjs),
  'Express.js': brand(siExpress),
  FastAPI: brand(siFastapi),
  Java: brand(siOpenjdk),
  'C++': brand(siCplusplus),
  PyTorch: brand(siPytorch),
  TensorFlow: brand(siTensorflow),
  'Scikit-learn': brand(siScikitlearn),
  'Hugging Face': brand(siHuggingface),
  LangChain: brand(siLangchain),
  OpenCV: brand(siOpencv),
  Docker: brand(siDocker),
  Kubernetes: brand(siKubernetes),
  MySQL: brand(siMysql),
  Git: brand(siGit),
  'GitHub Actions': brand(siGithubactions),
  Nginx: brand(siNginx),
  MLflow: brand(siMlflow),
  Vercel: brand(siVercel),
  Render: brand(siRender),

  // Outline glyphs
  AWS: outline('M7 18h10.5a4 4 0 0 0 .6-7.95A6.5 6.5 0 0 0 5.6 9.4 4.4 4.4 0 0 0 7 18z'),
  'REST APIs': outline(
    'M8 4C6 4 5 5 5 7v2c0 1.2-.8 2-2 3 1.2 1 2 1.8 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.2.8 2 2 3-1.2 1-2 1.8-2 3v2c0 2-1 3-3 3'
  ),
  WebSockets: outline('M4 8.5h14.5M15 5l3.5 3.5L15 12M20 15.5H5.5M9 12l-3.5 3.5L9 19'),
  NLP: outline('M4 5h16v11H10l-6 4V5zM8 9.5h8M8 12.5h5'),
  'Computer Vision': outline(
    'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'
  ),
  RAG: outline(
    'M13 3H6v18h6M13 3l4 4v4M13 3v4h4M17.5 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.6 19.6 22 22'
  ),
  'Model Deployment': outline(
    'M12 15 9 12c1.8-4.7 5-8.2 12-9-.8 7-4.3 10.2-9 12zM9 12H4.5S5.3 9 7 8c1.6-1 4.5-.5 4.5-.5M12 15v4.5s3-.8 4-2.5c1-1.6.5-4.5.5-4.5M6.5 15.5C5 16.8 4.5 19.5 4.5 19.5s2.7-.5 4-2'
  ),
}

/** Outline glyphs for the four stack areas */
export const AREA_ICONS: Record<string, string> = {
  frontend: 'M3 4h18v12H3zM8 20h8M12 16v4M9.5 8 7.5 10l2 2M14.5 8l2 2-2 2',
  backend: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01M12 7h4M12 17h4',
  ai: 'M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  devops:
    'M12 12c-2-2.7-3.5-4-5.5-4a4 4 0 0 0 0 8c2 0 3.5-1.3 5.5-4zm0 0c2 2.7 3.5 4 5.5 4a4 4 0 0 0 0-8c-2 0-3.5 1.3-5.5 4z',
}

/** The logo for a tool, or a neutral dot glyph when there is none */
export function techIcon(name: string): TechIcon {
  return ICONS[name] ?? outline('M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z')
}
