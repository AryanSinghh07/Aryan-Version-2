import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Match Prettier, which always writes void elements as <input />
    'vue/html-self-closing': [
      'warn',
      {
        html: { void: 'always', normal: 'always', component: 'always' },
        svg: 'always',
        math: 'always',
      },
    ],
  },
})
