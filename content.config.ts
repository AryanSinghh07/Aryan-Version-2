import { defineCollection, defineContentConfig, z } from '@nuxt/content'

// All portfolio text lives in /content, so copy changes never touch components.
// Headlines use *asterisks* around the one italic accent word, e.g. "Built to *ship*".

const link = z.object({ label: z.string(), handle: z.string(), url: z.string() })

export default defineContentConfig({
  collections: {
    profile: defineCollection({
      type: 'data',
      source: 'profile.json',
      schema: z.object({
        name: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        role: z.string(),
        tagline: z.string(),
        intro: z.string(),
        experience: z.string(),
        location: z.string(),
        timezone: z.string(),
        status: z.string(),
        email: z.string(),
        phone: z.string(),
        resume: z.string(),
        socials: z.array(link),
        marquee: z.array(z.string()),
        heroScenes: z.array(
          z.object({
            label: z.string(),
            headline: z.string(),
            text: z.string(),
            side: z.enum(['left', 'right', 'center']),
            particleShape: z.string(),
          })
        ),
        about: z.object({
          headline: z.string(),
          paragraphs: z.array(z.string()),
          funLine: z.string(),
        }),
        stats: z.array(
          z.object({
            value: z.number(),
            prefix: z.string().optional(),
            suffix: z.string().optional(),
            label: z.string(),
          })
        ),
        contact: z.object({
          headline: z.string(),
          body: z.string(),
          marquee: z.array(z.string()),
          availability: z.string(),
          lookingFor: z.array(z.string()),
          budgets: z.array(z.string()),
        }),
      }),
    }),

    stack: defineCollection({
      type: 'data',
      source: 'stack.json',
      schema: z.object({
        headline: z.string(),
        groups: z.array(z.object({ title: z.string(), tools: z.array(z.string()) })),
      }),
    }),

    recognition: defineCollection({
      type: 'data',
      source: 'recognition.json',
      schema: z.object({
        headline: z.string(),
        items: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            type: z.string(),
            detail: z.string(),
            year: z.number().optional(),
            images: z.array(z.string()).default([]),
          })
        ),
      }),
    }),

    education: defineCollection({
      type: 'data',
      source: 'education.json',
      schema: z.object({
        headline: z.string(),
        education: z.array(
          z.object({
            item: z.string(),
            institution: z.string(),
            years: z.string(),
            note: z.string(),
          })
        ),
        certifications: z.array(z.object({ title: z.string(), issuer: z.string() })),
      }),
    }),

    about: defineCollection({
      type: 'data',
      source: 'about.json',
      schema: z.object({
        scenes: z.array(
          z.object({
            label: z.string(),
            headline: z.string(),
            text: z.string(),
            side: z.enum(['left', 'right', 'center']).default('left'),
            particleShape: z.string().default('constellation'),
          })
        ),
        approach: z.object({
          headline: z.string(),
          steps: z.array(z.object({ title: z.string(), text: z.string() })),
        }),
        faq: z.array(z.object({ question: z.string(), answer: z.string() })),
      }),
    }),

    projects: defineCollection({
      type: 'page',
      source: 'projects/*.md',
      schema: z.object({
        slug: z.string(),
        subtitle: z.string(),
        year: z.number(),
        type: z.string(),
        scope: z.string(),
        stack: z.array(z.string()),
        summary: z.string(),
        github: z.string().optional(),
        live: z.string().optional(),
        cover: z.string().optional(),
        preview: z.string().optional(),
        gallery: z.array(z.string()).default([]),
        awards: z.array(z.string()).default([]),
        results: z.array(z.string()).default([]),
        particleShape: z.string(),
        featured: z.boolean().default(false),
        order: z.number(),
      }),
    }),
  },
})
