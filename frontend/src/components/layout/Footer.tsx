import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="cl-footer">
      <div className="cl-wrap cl-footer__grid">
        <div className="cl-footer__about">
          <Logo size="lg" className="cl-wordmark" />
          <p>Thoughtful civic reporting, with a clearer way to follow what happens next.</p>
        </div>
        <nav className="cl-footer__column" aria-label="Footer navigation">
          <h3>Explore</h3>
          <Link to="/">Home</Link>
          <Link to="/about">About the project</Link>
          <Link to="/faq">Frequently asked questions</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <div className="cl-footer__column">
          <h3>Your account</h3>
          <Link to="/login">Sign in <ArrowUpRight size={14} /></Link>
          <Link to="/register">Create an account <ArrowUpRight size={14} /></Link>
          <span>For emergencies, contact local emergency services directly.</span>
        </div>
      </div>
      <div className="cl-wrap cl-footer__bottom">
        <span>© {new Date().getFullYear()} CivicLink · Smart Civic Complaint System</span>
        <span>Portfolio prototype · Not affiliated with a government authority</span>
      </div>
    </footer>
  );
}
