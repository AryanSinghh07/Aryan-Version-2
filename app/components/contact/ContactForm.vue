<script setup lang="ts">
// Sentence-style contact form, delivered by Netlify Forms.
// With JavaScript: inline validation, sending without leaving the page, and a success or
// error state on the page. Without JavaScript: the browser's own validation and a normal
// post to Netlify, which then shows /thanks. Netlify finds the form in the prerendered HTML.
const props = defineProps<{ lookingFor: string[]; budgets: string[]; email: string }>()

type Field = 'name' | 'email'
type Status = 'idle' | 'sending' | 'sent' | 'error'

const form = ref<HTMLFormElement | null>(null)
const status = ref<Status>('idle')
const values = reactive({ name: '', email: '' })
const errors = reactive<Record<Field, string>>({ name: '', email: '' })
/** Errors show after the first submit attempt, then update as the visitor types */
const attempted = ref(false)
const successHeading = ref<HTMLElement | null>(null)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(field: Field) {
  const value = values[field].trim()
  if (field === 'name') {
    errors.name = value.length >= 2 ? '' : 'Please tell me your name.'
  } else if (!value) {
    errors.email = 'I need an email address to reply to.'
  } else {
    errors.email = EMAIL.test(value) ? '' : 'That email doesn’t look right (like you@email.com).'
  }
  return !errors[field]
}

function onInput(field: Field) {
  if (attempted.value) validate(field)
}

async function onSubmit() {
  const el = form.value
  if (!el || status.value === 'sending') return
  attempted.value = true
  const nameOk = validate('name')
  const emailOk = validate('email')
  if (!nameOk || !emailOk) {
    el.querySelector<HTMLElement>(nameOk ? '#contact-email' : '#contact-name')?.focus()
    return
  }

  status.value = 'sending'
  try {
    const body = new URLSearchParams()
    for (const [key, value] of new FormData(el)) body.append(key, String(value))
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    status.value = 'sent'
    await nextTick()
    successHeading.value?.focus()
  } catch {
    status.value = 'error'
  }
}

function reset() {
  status.value = 'idle'
  attempted.value = false
  values.name = ''
  values.email = ''
  errors.name = ''
  errors.email = ''
  form.value?.reset()
}

// The browser's own validation stays on without JavaScript; with it, ours takes over
onMounted(() => {
  if (form.value) form.value.noValidate = true
})
</script>

<template>
  <div class="contact-form">
    <div v-if="status === 'sent'" class="form__done" role="status">
      <p class="t-label form__done-label">Message sent</p>
      <h2 ref="successHeading" v-reveal tabindex="-1" class="t-h2">
        <UiAccentText text="Thank *you*" />
      </h2>
      <p>I’ll reply to {{ values.email }} soon, usually within a day or two.</p>
      <button type="button" class="text-link form__again" @click="reset">
        Send another message
      </button>
    </div>

    <form
      v-show="status !== 'sent'"
      ref="form"
      name="contact"
      method="POST"
      action="/thanks"
      data-netlify="true"
      netlify-honeypot="bot-field"
      class="form"
      @submit.prevent="onSubmit"
    >
      <input type="hidden" name="form-name" value="contact" />
      <p class="sr-only">
        <label
          >Leave this field empty <input name="bot-field" tabindex="-1" autocomplete="off"
        /></label>
      </p>

      <fieldset class="form__group">
        <legend class="form__sentence">I’m looking for</legend>
        <div class="form__chips">
          <label v-for="(option, i) in props.lookingFor" :key="option" class="chip">
            <input type="radio" name="looking-for" :value="option" :checked="i === 0" required />
            <span>{{ option }}</span>
          </label>
        </div>
      </fieldset>

      <fieldset class="form__group">
        <legend class="form__sentence">My budget is</legend>
        <div class="form__chips">
          <label v-for="(option, i) in props.budgets" :key="option" class="chip">
            <input type="radio" name="budget" :value="option" :checked="i === 0" />
            <span>{{ option }}</span>
          </label>
        </div>
      </fieldset>

      <div class="form__line">
        <label for="contact-name" class="form__sentence">My name is</label>
        <input
          id="contact-name"
          v-model="values.name"
          name="name"
          type="text"
          class="form__input"
          placeholder="your name"
          autocomplete="name"
          required
          minlength="2"
          :aria-invalid="errors.name ? 'true' : undefined"
          :aria-describedby="errors.name ? 'contact-name-error' : undefined"
          @input="onInput('name')"
          @blur="attempted && validate('name')"
        />
        <p v-if="errors.name" id="contact-name-error" class="form__error">{{ errors.name }}</p>
      </div>

      <div class="form__line">
        <label for="contact-email" class="form__sentence">and you can reach me at</label>
        <input
          id="contact-email"
          v-model="values.email"
          name="email"
          type="email"
          class="form__input"
          placeholder="you@email.com"
          autocomplete="email"
          required
          :aria-invalid="errors.email ? 'true' : undefined"
          :aria-describedby="errors.email ? 'contact-email-error' : undefined"
          @input="onInput('email')"
          @blur="attempted && validate('email')"
        />
        <p v-if="errors.email" id="contact-email-error" class="form__error">
          {{ errors.email }}
        </p>
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

      <p v-if="status === 'error'" class="form__failed" role="alert">
        The message couldn’t be sent just now. Please try again, or email me directly at
        <a :href="`mailto:${props.email}`" class="text-link">{{ props.email }}</a
        >.
      </p>

      <UiGlassButton
        type="submit"
        variant="primary"
        class="form__submit"
        :disabled="status === 'sending'"
      >
        {{ status === 'sending' ? 'Sending…' : 'Send message' }}
      </UiGlassButton>
    </form>
  </div>
</template>

<style scoped lang="scss">
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

.form__error {
  flex-basis: 100%;
  color: var(--danger);
  font-size: 0.9375rem;
}

.form__input[aria-invalid='true'] {
  border-bottom-color: var(--danger);
}

.form__failed {
  padding: 1rem 1.25rem;
  border: 1px solid var(--danger);
  border-radius: 1rem;
}

.form__done {
  display: grid;
  gap: 1.25rem;
  justify-items: start;
  padding: 2rem 0;

  h2:focus {
    outline: none;
  }
}

.form__done-label {
  color: var(--success);
}

.form__again {
  font: inherit;
}
</style>
