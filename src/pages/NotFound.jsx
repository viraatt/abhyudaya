import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import './NotFound.css'

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>404 Page Not Found | Abhyudaya Club</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <section className="notfound">
        <div className="wrap notfound__inner">
          <p className="eyebrow">404</p>
          <h1>This page hasn't taken off yet.</h1>
          <p className="notfound__lede">
            The page you're looking for doesn't exist — or has moved.
          </p>
          <Link to="/" className="btn btn--solid">
            Back to home
          </Link>
        </div>
      </section>
    </>
  )
}
