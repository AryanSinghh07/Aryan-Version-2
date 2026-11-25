interface PageSeo {
  /** Page title (the site name is added by the title template); omit on the home page */
  title?: MaybeRefOrGetter<string | undefined>
  description: MaybeRefOrGetter<string | undefined>
  /** The page's own preview image for shares (a path on this site); /og.png otherwise */
  image?: MaybeRefOrGetter<string | undefined>
  /** Alt text for that image */
  imageAlt?: MaybeRefOrGetter<string | undefined>
  /** Keep the page out of search results */
  noindex?: boolean
}

const SITE_NAME = 'Aryan Singh'
/** Aryan's X handle, credited on shared cards */
const X_HANDLE = '@the_aryansingh_'
const DEFAULT_IMAGE_ALT = 'Aryan Singh, Full Stack Developer and AI/ML Engineer'
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

  // A page's own image (a project's cover) or the site card; its size is only known for the card
  const ownImage = () => toValue(seo.image)
  const image = () => `${siteUrl}${ownImage() ?? '/og.png'}`
  const imageAlt = () => toValue(seo.imageAlt) ?? DEFAULT_IMAGE_ALT

  useSeoMeta({
    title: () => toValue(seo.title),
    description,
    author: SITE_NAME,
    ogTitle: fullTitle,
    ogDescription: description,
    ogUrl: () => url.value,
    ogType: 'website',
    ogSiteName: SITE_NAME,
    ogLocale: 'en_IN',
    ogImage: image,
    ogImageWidth: () => (ownImage() ? undefined : 1200),
    ogImageHeight: () => (ownImage() ? undefined : 630),
    ogImageAlt: imageAlt,
    twitterCard: 'summary_large_image',
    twitterCreator: X_HANDLE,
    twitterTitle: fullTitle,
    twitterDescription: description,
    twitterImage: image,
    twitterImageAlt: imageAlt,
    robots: seo.noindex ? 'noindex' : 'index, follow, max-image-preview:large',
  })
  useHead({ link: [{ rel: 'canonical', href: () => url.value }] })
}
