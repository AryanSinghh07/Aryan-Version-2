<script setup lang="ts">
// Site footer. The "Keep scrolling" next-page transition is added in Phase 10.
const { data: profile } = await useProfile()

const pages = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/work', label: 'Work' },
  { to: '/contact', label: 'Contact' },
]
</script>

<template>
  <footer v-if="profile" class="footer">
    <div class="footer__inner container">
      <p class="footer__headline t-h2"><UiAccentText text="Let's *talk*" /></p>

      <div class="footer__grid">
        <div class="footer__col">
          <p class="t-label t-muted">Email</p>
          <UiCopyEmail :email="profile.email" />
          <a :href="profile.resume" class="footer__link" download>Download resume (PDF)</a>
        </div>

        <div class="footer__col">
          <p class="t-label t-muted">Social</p>
          <ul role="list">
            <li v-for="s in profile.socials" :key="s.url">
              <a :href="s.url" target="_blank" rel="noopener noreferrer" class="footer__link">
                {{ s.label }} ↗
              </a>
            </li>
          </ul>
        </div>

        <nav class="footer__col" aria-label="Footer">
          <p class="t-label t-muted">Pages</p>
          <ul role="list">
            <li v-for="p in pages" :key="p.to">
              <NuxtLink :to="p.to" class="footer__link">{{ p.label }}</NuxtLink>
            </li>
          </ul>
        </nav>

        <div class="footer__col">
          <p class="t-label t-muted">Location</p>
          <p>{{ profile.location }}</p>
          <p class="t-muted">{{ profile.timezone }} (UTC+5:30)</p>
        </div>
      </div>

      <div class="footer__bottom t-label t-muted">
        <span>© 2026 {{ profile.name }}</span>
        <span>{{ profile.role }}</span>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.footer {
  border-top: 1px solid var(--border);
  padding-block: 5rem 2rem;
}

.footer__inner {
  display: grid;
  gap: 4rem;
}

.footer__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: 1.5fr repeat(3, 1fr);
  }
}

.footer__col {
  display: grid;
  gap: 0.75rem;
  align-content: start;

  ul {
    display: grid;
    gap: 0.5rem;
  }
}

.footer__link {
  display: inline-block;
  min-height: 24px;

  &:hover {
    color: var(--primary);
  }
}

.footer__bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}
</style>
