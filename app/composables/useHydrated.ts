/**
 * False until this component has mounted. Saved settings (theme, sound, quality) are applied
 * to the store in the browser, and a component inside async content (the header awaits its
 * data) can hydrate after that, so anything showing a saved setting renders the server
 * defaults until mounted. Otherwise server and client HTML would differ.
 */
export function useHydrated() {
  const hydrated = ref(false)
  onMounted(() => (hydrated.value = true))
  return hydrated
}
