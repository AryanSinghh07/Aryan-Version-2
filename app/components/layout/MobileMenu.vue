<script setup lang="ts">
// Full-screen menu for small screens. Closes on Escape, link click or route change.
const props = defineProps<{ open: boolean; links: { to: string; label: string }[] }>()
const emit = defineEmits<{ close: [] }>()

const { data: profile } = await useProfile()
const store = useAppStore()
const route = useRoute()
const closeButton = ref<HTMLButtonElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!import.meta.client) return
    // Pauses smooth scroll and hero scene input behind the menu
    store.overlayOpen = open
    document.documentElement.style.overflow = open ? 'hidden' : ''
    if (open) {
      await nextTick()
      closeButton.value?.focus()
    }
  }
)

watch(
  () => route.fullPath,
  () => {
    if (props.open) emit('close')
  }
)

onKeyStroke('Escape', () => {
  if (props.open) emit('close')
})

// Keep keyboard focus inside the open menu
const menu = ref<HTMLElement | null>(null)
function trapFocus(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !menu.value) return
  const focusable = [
    ...menu.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ),
  ].filter((el) => el.offsetParent !== null)
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = ''
  store.overlayOpen = false
})
</script>

<template>
  <div
    v-show="open"
    id="mobile-menu"
    ref="menu"
    class="menu"
    role="dialog"
    aria-modal="true"
    aria-label="Menu"
    data-lenis-prevent
    @keydown="trapFocus"
  >
    <div class="menu__top container">
      <span class="t-label t-muted">Menu</span>
      <button ref="closeButton" type="button" class="menu__close t-label" @click="emit('close')">
        Close
      </button>
    </div>

    <nav class="menu__nav container" aria-label="Mobile">
      <ul role="list">
        <li>
          <NuxtLink to="/" class="menu__link t-h2">Home</NuxtLink>
        </li>
        <li v-for="link in links" :key="link.to">
          <NuxtLink :to="link.to" class="menu__link t-h2">{{ link.label }}</NuxtLink>
        </li>
      </ul>
    </nav>

    <div v-if="profile" class="menu__bottom container">
      <SettingsControls id-prefix="menu" />
      <UiCopyEmail :email="profile.email" />
      <ul role="list" class="menu__socials">
        <li v-for="s in profile.socials" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer" class="t-label"
            >{{ s.label }} ↗</a
          >
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
.menu {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2rem;
  padding-block: 1rem 2rem;
  overflow-y: auto;
  background: var(--background);
}

.menu__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu__close {
  min-height: 44px;
  padding-inline: 0.25rem;
}

.menu__nav ul {
  display: grid;
  gap: 0.5rem;
}

.menu__link {
  display: inline-block;
  font-size: min(var(--text-h2), 16vw);

  &.router-link-exact-active {
    color: var(--primary);
  }
}

.menu__bottom {
  display: grid;
  gap: 1.25rem;
  justify-items: start;
}

.menu__socials {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;

  a {
    display: inline-block;
    min-height: 32px;
  }
}
</style>
