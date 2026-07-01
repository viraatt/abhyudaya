import { Link } from 'react-router-dom'
import './NotFound.css'

export default function NotFound() {
  return (
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
  )
}
