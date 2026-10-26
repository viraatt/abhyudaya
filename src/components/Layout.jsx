import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import NotificationPrompt from './NotificationPrompt.jsx'

export default function Layout() {
  return (
    <div className="site">
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <NotificationPrompt />
    </div>
  )
}

