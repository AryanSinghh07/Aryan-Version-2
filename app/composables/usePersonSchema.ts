/**
 * schema.org Person and WebSite data for search engines (JSON-LD), built from the same
 * content as the page. Used on the home page.
 */
export async function usePersonSchema() {
  const { siteUrl } = useRuntimeConfig().public
  // Every composable is called before the await: after an await, a composable outside
  // <script setup> no longer has the Nuxt instance
  const profileRequest = useProfile()
  const educationRequest = useEducation()
  const profile = profileRequest.data
  const education = educationRequest.data

  useHead({
    script: [
      {
        type: 'application/ld+json',
        key: 'person-schema',
        innerHTML: () => {
          const p = profile.value
          if (!p) return ''
          const university = education.value?.education[0]
          return JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Person',
                '@id': `${siteUrl}/#person`,
                name: p.name,
                givenName: p.firstName,
                familyName: p.lastName,
                jobTitle: p.role,
                description: p.tagline,
                url: `${siteUrl}/`,
                image: `${siteUrl}/og.png`,
                email: `mailto:${p.email}`,
                address: {
                  '@type': 'PostalAddress',
                  addressRegion: p.location,
                  addressCountry: 'IN',
                },
                sameAs: p.socials.map((s) => s.url),
                ...(university && {
                  alumniOf: { '@type': 'CollegeOrUniversity', name: university.institution },
                }),
                knowsAbout: p.marquee,
              },
              {
                '@type': 'WebSite',
                '@id': `${siteUrl}/#website`,
                url: `${siteUrl}/`,
                name: p.name,
                author: { '@id': `${siteUrl}/#person` },
              },
            ],
          })
        },
      },
    ],
  })

  await Promise.all([profileRequest, educationRequest])
}
