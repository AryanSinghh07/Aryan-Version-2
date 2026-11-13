<script setup lang="ts">
// Internal test page: every design-system piece in both themes, side by side.
// Hidden from search engines; not linked from the site.
useSeoMeta({ title: 'Style guide', robots: 'noindex, nofollow' })

const themes = ['light', 'dark'] as const
const swatches = [
  'background',
  'surface',
  'foreground',
  'foreground-muted',
  'primary',
  'primary-active',
  'accent',
  'border',
  'danger',
  'success',
]
const marquee = [
  'Full Stack',
  'AI / ML',
  'Computer Vision',
  'NLP',
  'React',
  'Python',
  'Next.js',
  'TensorFlow',
]
// Bound, not a plain attribute: vue-tsc misreads '//' inside static attributes in a v-for
const githubUrl = 'https://github.com/AryanSinghh07'
const toggles = reactive({ light: true, dark: false })
</script>

<template>
  <div class="styleguide">
    <header class="container styleguide__header">
      <UiSectionLabel :index="0" label="Style guide" />
      <h1 class="t-h2">Design <em>system</em></h1>
      <p class="t-muted">Site theme toggle (saved after reload):</p>
      <UiThemeToggle />
    </header>

    <div class="styleguide__panels">
      <section
        v-for="theme in themes"
        :key="theme"
        :data-theme="theme"
        class="panel"
        :aria-label="`${theme} theme`"
      >
        <UiSectionLabel :index="theme === 'light' ? 1 : 2" :label="`${theme} theme`" />

        <h2 class="t-hero">Aryan <em>Singh</em></h2>
        <h3 class="t-h2">Built to <em>ship</em></h3>
        <h4 class="t-h3">AI Crop Disease Prediction</h4>
        <p class="t-body">
          Full-Stack Developer and AI/ML Engineer building systems that solve real problems, from
          cattle classification for the Rashtriya Gokul Mission to mental-health platforms for
          students.
        </p>
        <p class="t-label t-muted">[01] ↪ Computer Vision for Farmers · 2024</p>
        <p><a href="#" class="link">A text link</a></p>

        <div class="row">
          <UiGlassButton>Let's talk</UiGlassButton>
          <UiGlassButton variant="secondary">View all work</UiGlassButton>
          <UiGlassButton variant="outline" :href="githubUrl">GitHub ↗</UiGlassButton>
          <UiGlassButton variant="ghost">Ghost</UiGlassButton>
          <UiGlassButton variant="ghost-primary">Ghost primary</UiGlassButton>
          <UiGlassButton variant="danger">Delete</UiGlassButton>
          <UiGlassButton variant="ghost-danger">Remove</UiGlassButton>
          <UiGlassButton disabled>Disabled</UiGlassButton>
        </div>

        <div class="row">
          <UiTag>Open to work</UiTag>
          <UiTag variant="outline">Python</UiTag>
          <UiTag variant="surface">TensorFlow</UiTag>
        </div>

        <div class="row stats">
          <div>
            <p class="t-h2"><UiCounter :value="2000" suffix="+" /></p>
            <p class="t-label t-muted">Trade show audience</p>
          </div>
          <div>
            <p class="t-h2"><UiCounter :value="5" /></p>
            <p class="t-label t-muted">Certifications</p>
          </div>
        </div>

        <UiToggleSwitch v-model="toggles[theme]" label="Sound" />

        <div class="card">
          <p class="t-label t-muted">Card on surface</p>
          <p>Text on the surface colour.</p>
          <p class="t-label" style="color: var(--danger)">Please enter your email</p>
          <p class="t-label" style="color: var(--success)">Message sent</p>
        </div>

        <div class="swatches">
          <div v-for="s in swatches" :key="s" class="swatch">
            <span class="swatch__chip" :style="{ background: `var(--${s})` }" />
            <span class="t-label">{{ s }}</span>
          </div>
        </div>

        <UiMarquee :items="marquee" class="t-h3" :duration="25" />
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.styleguide__header {
  display: grid;
  gap: 1rem;
  justify-items: start;
  padding-block: 7rem 2rem;
}

.styleguide__panels {
  display: grid;
  grid-template-columns: 1fr;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }
}

.panel {
  display: grid;
  gap: 1.5rem;
  align-content: start;
  min-width: 0;
  padding: 3rem max(1rem, 4vw);

  .t-hero {
    font-size: min(var(--text-hero), 18vw);

    @media (min-width: 1024px) {
      font-size: min(var(--text-hero), 9vw);
    }
  }
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.stats {
  gap: 2.5rem;
}

.link {
  color: var(--primary);
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;

  &:hover {
    color: var(--primary-active);
  }
}

.card {
  display: grid;
  gap: 0.5rem;
  padding: 1.5rem;
  border-radius: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
}

.swatches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.75rem;
}

.swatch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.swatch__chip {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
</style>
