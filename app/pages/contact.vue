<script setup lang="ts">
usePageSeo({
  title: 'Contact',
  description:
    'Hire Aryan Singh for internships, freelance web apps and AI/ML projects. Open to work, based in the Greater Delhi Area (IST).',
})

const { data: profile } = await useProfile()

// The Contact page, in the same style as About and Work: a plain near-black page (the 3D
// world rests, hidden, behind it: see hidesWorld). A big "Let's talk" with the email and the
// time in India, then the sentence-style form in a card with a glow that follows the pointer,
// beside the other ways to get in touch.

const card = ref<HTMLElement | null>(null)
function spotlight(e: PointerEvent) {
  const el = card.value
  if (!el) return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}
</script>

<template>
  <div v-if="profile" class="contact-page">
    <ContactHero
      :email="profile.email"
      :body="profile.contact.body"
      :location="profile.location"
      :timezone="profile.timezone"
    />

    <section class="contact-main section container" aria-labelledby="form-title">
      <div id="contact-form" ref="card" class="contact-main__card" @pointermove="spotlight">
        <header class="contact-main__head">
          <p class="t-label t-muted">(01) Start something</p>
          <h2 id="form-title" v-reveal class="t-h2">
            <UiAccentText text="Tell me *about it*" />
          </h2>
        </header>
        <ContactForm :looking-for="profile.contact.lookingFor" :email="profile.email" />
      </div>

      <ContactChannels
        :phone="profile.phone"
        :socials="profile.socials"
        :availability="profile.contact.availability"
        :resume="profile.resume"
      />
    </section>
  </div>
</template>

<style scoped lang="scss">
.contact-page {
  --page-bg: var(--background);

  position: relative;
  background-color: var(--page-bg);
  overflow-x: clip;
}

:global([data-theme='dark'] .contact-page) {
  --page-bg: #121212;
}

.contact-main {
  display: grid;
  gap: 4rem;
  padding-top: clamp(3rem, 6vw, 5rem);

  @media (min-width: 1100px) {
    grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
    align-items: start;
    gap: clamp(3rem, 5vw, 5rem);
  }
}

// The form's card: a soft violet light follows the pointer across it
.contact-main__card {
  --mx: 70%;
  --my: 0%;

  position: relative;
  display: grid;
  gap: 2.5rem;
  padding: clamp(1.5rem, 4vw, 3.5rem);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
  border-radius: clamp(1.25rem, 2.5vw, 2rem);
  background: color-mix(in srgb, var(--foreground) 3.5%, var(--page-bg));
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: radial-gradient(
      32rem circle at var(--mx) var(--my),
      rgba(var(--primary-rgb), 0.16),
      transparent 60%
    );
    transition: opacity 0.4s ease;
  }

  // A thin violet line along the top
  &::after {
    content: '';
    position: absolute;
    inset: 0 12% auto;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--primary), transparent);
  }

  @media (max-width: 640px) {
    margin-inline: calc(-1 * max(1rem, 4vw) + 0.5rem);
  }
}

.contact-main__head {
  display: grid;
  gap: 1rem;

  p,
  h2 {
    margin: 0;
  }
}

// The form card scrolls into view: sit just below the header when jumping to it
#contact-form {
  scroll-margin-top: 7rem;
}
</style>
