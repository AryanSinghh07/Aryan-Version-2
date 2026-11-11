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
      <!--
        Sentence-style form. Works without JavaScript through Netlify Forms (detected in the
        prerendered HTML). Phase 10 adds inline validation and an on-page success state.
      -->
      <form
        name="contact"
        method="POST"
        data-netlify="true"
        netlify-honeypot="bot-field"
        class="form"
      >
        <input type="hidden" name="form-name" value="contact" />
        <p class="sr-only">
          <label
            >Leave this field empty <input name="bot-field" tabindex="-1" autocomplete="off"
          /></label>
        </p>

        <fieldset class="form__group">
          <legend class="form__sentence">I'm looking for</legend>
          <div class="form__chips">
            <label v-for="(option, i) in profile.contact.lookingFor" :key="option" class="chip">
              <input type="radio" name="looking-for" :value="option" :checked="i === 0" required />
              <span>{{ option }}</span>
            </label>
          </div>
        </fieldset>

        <fieldset class="form__group">
          <legend class="form__sentence">My budget is</legend>
          <div class="form__chips">
            <label v-for="(option, i) in profile.contact.budgets" :key="option" class="chip">
              <input type="radio" name="budget" :value="option" :checked="i === 0" />
              <span>{{ option }}</span>
            </label>
          </div>
        </fieldset>

        <div class="form__line">
          <label for="contact-name" class="form__sentence">My name is</label>
          <input
            id="contact-name"
            name="name"
            type="text"
            class="form__input"
            placeholder="your name"
            autocomplete="name"
            required
          />
        </div>

        <div class="form__line">
          <label for="contact-email" class="form__sentence">and you can reach me at</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            class="form__input"
            placeholder="you@email.com"
            autocomplete="email"
            required
          />
        </div>

        <div class="form__line form__line--block">
          <label for="contact-message" class="form__sentence">A little more about it</label>
          <textarea
            id="contact-message"
            name="message"
            rows="4"
            class="form__input form__textarea"
            placeholder="optional"
          />
        </div>

        <UiGlassButton type="submit" variant="primary" class="form__submit">
          Send message
        </UiGlassButton>
      </form>

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

.form {
  display: grid;
  gap: 2.5rem;
}

.form__group {
  border: 0;
  padding: 0;
  min-width: 0;
}

.form__sentence {
  display: block;
  padding: 0;
  margin-bottom: 1rem;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 5vw, 2.75rem);
  line-height: 1;
}

.form__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  position: relative;
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  span {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0.5em 1.1em;
    border: 1px solid var(--border);
    border-radius: 999px;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      border-color 0.2s ease;
  }

  &:hover span {
    border-color: var(--primary);
  }

  input:checked + span {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
  }

  input:focus-visible + span {
    outline: 2px solid var(--primary);
    outline-offset: 3px;
  }
}

.form__line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 1rem;

  .form__sentence {
    margin-bottom: 0;
  }
}

.form__line--block {
  display: grid;
}

.form__input {
  flex: 1 1 14rem;
  min-width: 0;
  min-height: 44px;
  padding: 0.4rem 0;
  border: 0;
  border-bottom: 2px solid var(--border);
  background: transparent;
  font-size: 1.25rem;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: var(--foreground-muted);
  }

  &:focus {
    outline: none;
    border-bottom-color: var(--primary);
  }

  &:focus-visible {
    outline: none;
  }
}

.form__textarea {
  resize: vertical;
  font-size: 1.125rem;
}

.form__submit {
  justify-self: start;
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
