import { Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import Icon from '../components/ui/Icon';

export default function NotFoundPage({ standalone = false }) {
  return (
    <div className={`not-found ${standalone ? 'not-found--standalone' : ''}`.trim()}>
      <Logo size="lg" />
      <p className="not-found__code">404</p>
      <h1 className="not-found__title">This page took a day off.</h1>
      <p className="not-found__text">
        We looked everywhere — under the leave requests, behind the org chart — but this page
        doesn’t exist. Let’s get you back to somewhere useful.
      </p>
      <div className="not-found__actions">
        <Link to="/dashboard" className="btn btn--primary btn--lg">
          <Icon name="dashboard" size={16} />
          Back to dashboard
        </Link>
        <Link to="/announcements" className="btn btn--secondary btn--lg">
          Read announcements
        </Link>
      </div>
    </div>
  );
}
