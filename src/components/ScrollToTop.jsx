import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Resets scroll position whenever the route changes, since this is an SPA
// and the browser won't do this automatically like it does for full page loads.
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
