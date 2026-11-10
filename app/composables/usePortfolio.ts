// Shared loaders for /content. Each uses a fixed key, so every component that calls
// the same loader shares one fetch and one cached result.

async function required<T>(what: string, data: T | null | undefined): Promise<T> {
  if (!data)
    throw createError({ statusCode: 500, statusMessage: `Missing content: ${what}`, fatal: true })
  return data
}

export function useProfile() {
  return useAsyncData('content-profile', async () =>
    required('profile.json', await queryCollection('profile').first())
  )
}

export function useStack() {
  return useAsyncData('content-stack', async () =>
    required('stack.json', await queryCollection('stack').first())
  )
}

export function useRecognition() {
  return useAsyncData('content-recognition', async () =>
    required('recognition.json', await queryCollection('recognition').first())
  )
}

export function useEducation() {
  return useAsyncData('content-education', async () =>
    required('education.json', await queryCollection('education').first())
  )
}

export function useAbout() {
  return useAsyncData('content-about', async () =>
    required('about.json', await queryCollection('about').first())
  )
}

/** All projects in display order */
export function useProjects() {
  return useAsyncData('content-projects', () =>
    queryCollection('projects').order('order', 'ASC').all()
  )
}

/** Two-digit project number, e.g. 1 -> "01" */
export function projectNumber(order: number) {
  return String(order).padStart(2, '0')
}
