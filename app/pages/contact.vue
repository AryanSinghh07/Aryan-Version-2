<script setup lang="ts">
useSeoMeta({
  title: 'Contact',
  description:
    'Hire Aryan Singh for internships, freelance web apps and AI/ML projects. Open to work, based in the Greater Delhi Area (IST).',
})

const { data: profile } = await useProfile()
</script>

<template>
  <div v-if="profile" class="contact page-top container">
    <header class="section__head">
      <UiSectionLabel :index="3" label="Contact" />
      <h1 v-reveal class="t-hero"><UiAccentText :text="profile.contact.headline" /></h1>
      <p class="contact__body">{{ profile.contact.body }}</p>
    </header>

    <div class="contact__layout">
      <ContactForm
        :looking-for="profile.contact.lookingFor"
        :budgets="profile.contact.budgets"
        :email="profile.email"
      />

      <aside class="contact__aside" aria-label="Direct contact">
        <div class="contact__block">
          <p class="t-label t-muted">Email</p>
          <UiCopyEmail :email="profile.email" />
        </div>
        <div class="contact__block">
          <p class="t-label t-muted">Phone</p>
          <a :href="`tel:${profile.phone.replace(/\s/g, '')}`" class="text-link">{{
            profile.phone
          }}</a>
        </div>
        <div class="contact__block">
          <p class="t-label t-muted">Elsewhere</p>
          <ul role="list" class="contact__socials">
            <li v-for="s in profile.socials" :key="s.url">
              <a :href="s.url" target="_blank" rel="noopener noreferrer">
                {{ s.label }} <span class="t-muted">{{ s.handle }}</span> ↗
              </a>
            </li>
          </ul>
        </div>
        <div class="contact__block">
          <p class="t-label t-muted">Availability</p>
          <p><UiTag>Open to work</UiTag></p>
          <p>{{ profile.contact.availability }}</p>
          <p class="t-muted">{{ profile.location }} · {{ profile.timezone }}</p>
        </div>
        <a :href="profile.resume" class="text-link" download>Download resume (PDF)</a>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.contact {
  padding-bottom: clamp(5rem, 12vw, 10rem);
}

.contact__body {
  max-width: 36rem;
  font-size: 1.125rem;
}

.contact__layout {
  display: grid;
  gap: 5rem;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 6rem;
  }
}

.contact__aside {
  display: grid;
  gap: 2.5rem;
  align-content: start;
}

.contact__block {
  display: grid;
  gap: 0.6rem;
  justify-items: start;
}

.contact__socials {
  display: grid;
  gap: 0.5rem;

  a:hover {
    color: var(--primary);
  }
}
</style>
