import { useEffect, useState } from 'react'

// Phones; the same breakpoint as the phone rules at the end of index.css
export const PHONE_QUERY = '(max-width: 600px)'

// Whether the media query matches, updated when it starts or stops matching (e.g. when a phone is rotated)
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}
