<script setup lang="ts">
const { data: profile } = await useProfile()

const links = [
  { to: '/about', label: 'About' },
  { to: '/work', label: 'Work' },
  { to: '/contact', label: 'Contact' },
]

const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)

function closeMenu() {
  menuOpen.value = false
  menuButton.value?.focus()
}
</script>

<template>
  <header class="header">
    <div class="header__inner container">
      <NuxtLink to="/" class="header__logo t-label" aria-label="Aryan Singh, home">
        <span class="header__mark" aria-hidden="true">AS</span>
        <span class="header__name">{{ profile?.name }}</span>
      </NuxtLink>

      <nav class="header__nav" aria-label="Main">
        <ul role="list">
          <li v-for="(link, i) in links" :key="link.to">
            <NuxtLink :to="link.to" class="header__link t-label">
              <span class="header__index" aria-hidden="true">[0{{ i + 1 }}]</span>
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="header__actions">
        <SettingsPanel class="header__settings" />
        <UiGlassButton to="/contact" class="header__cta">Let's talk</UiGlassButton>
        <button
          ref="menuButton"
          type="button"
          class="header__menu-button t-label"
          aria-controls="mobile-menu"
          :aria-expanded="menuOpen"
          @click="menuOpen = true"
        >
          Menu
        </button>
      </div>
    </div>

    <LayoutMobileMenu :open="menuOpen" :links="links" @close="closeMenu" />
  </header>
</template>

<style scoped lang="scss">
.header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  background: linear-gradient(rgba(var(--background-rgb), 0.92), rgba(var(--background-rgb), 0));
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding-block: 1rem;
}

.header__logo {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
}

.header__mark {
  display: grid;
  place-items: center;
  width: 2.25rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--foreground);
  color: var(--background);
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 0;
}

.header__nav {
  display: none;

  ul {
    display: flex;
    gap: 2rem;
  }
}

.header__link {
  display: inline-flex;
  gap: 0.4em;
  align-items: center;
  min-height: 44px;

  &:hover,
  &.router-link-active {
    color: var(--primary);
  }
}

.header__index {
  color: var(--foreground-muted);
}

.header__actions {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.header__settings,
.header__cta {
  display: none;
}

.header__menu-button {
  min-height: 44px;
  padding-inline: 0.25rem;
}

@media (min-width: 900px) {
  .header__nav,
  .header__settings {
    display: block;
  }

  .header__cta {
    display: inline-flex;
  }

  .header__menu-button {
    display: none;
  }
}

@media (max-width: 380px) {
  .header__name {
    display: none;
  }
}
</style>
