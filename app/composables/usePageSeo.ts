interface PageSeo {
  /** Page title (the site name is added by the title template); omit on the home page */
  title?: MaybeRefOrGetter<string | undefined>
  description: MaybeRefOrGetter<string | undefined>
  /** Keep the page out of search results */
  noindex?: boolean
}

const SITE_NAME = 'Aryan Singh'
/** Search results show about this many characters of a description */
const DESCRIPTION_LENGTH = 160

/** Shortens a long description at a word boundary, so results never cut it mid-word */
function trimDescription(text: string | undefined) {
  if (!text || text.length <= DESCRIPTION_LENGTH) return text
  const cut = text.slice(0, DESCRIPTION_LENGTH - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:—–-]+$/, '')}…`
}
const DEFAULT_TITLE = 'Aryan Singh — Full Stack Developer and AI/ML Engineer'

/**
 * Title, description, social card (Open Graph and X) and canonical link for a page, kept in
 * one place so every page gets all of them. The card image is /og.png (1200 × 630).
 */
export function usePageSeo(seo: PageSeo) {
  const route = useRoute()
  const { siteUrl } = useRuntimeConfig().public
  const url = computed(() => {
    const path = normalizePath(route.path)
    return `${siteUrl}${path === '/' ? '/' : path}`
  })
  const description = () => trimDescription(toValue(seo.description))
  const fullTitle = () => {
    const title = toValue(seo.title)
    return title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE
  }

  useSeoMeta({
    title: () => toValue(seo.title),
    description,
    ogTitle: fullTitle,
    ogDescription: description,
    ogUrl: () => url.value,
    ogType: 'website',
    ogSiteName: SITE_NAME,
    ogImage: `${siteUrl}/og.png`,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: 'Aryan Singh, Full Stack Developer and AI/ML Engineer',
    twitterCard: 'summary_large_image',
    twitterTitle: fullTitle,
    twitterDescription: description,
    twitterImage: `${siteUrl}/og.png`,
    robots: seo.noindex ? 'noindex' : undefined,
  })
  useHead({ link: [{ rel: 'canonical', href: () => url.value }] })
}
