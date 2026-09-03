import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';
import {
  FaFacebookF,
  FaTwitter,
  FaYoutube,
  FaLinkedinIn
} from "react-icons/fa";

import { Logo } from './Logo';

const emergencyContacts = [
  { label: 'Police', number: '100' },
  { label: 'Ambulance', number: '102' },
  { label: 'Fire Service', number: '101' },
  { label: 'Municipal Helpline', number: '16600123456' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
      <div className="container-page py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo size="lg" />
            <p className="mt-3 max-w-xs text-sm text-ink-500">
              Report civic issues, track their progress, and help build a cleaner, safer community together.
            </p>
            <div className="mt-4 flex gap-2">
              {[FaFacebookF, FaTwitter, FaYoutube, FaLinkedinIn].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-ink-700"
                  aria-label="Social media link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Quick Links</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                { label: 'Report an Issue', to: '/report' },
                { label: 'Track Complaint', to: '/track' },
                { label: 'Public Map', to: '/map' },
                { label: 'About Us', to: '/about' },
                { label: 'FAQ', to: '/faq' },
                { label: 'Contact', to: '/contact' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-ink-500 hover:text-primary-600">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Emergency Contacts</h3>
            <div className="mt-3 rounded-xl border border-error-200 bg-error-50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-error-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Do not use this system for emergencies
              </p>
              <ul className="space-y-1.5">
                {emergencyContacts.map((e) => (
                  <li key={e.label} className="flex items-center justify-between text-sm">
                    <span className="text-ink-600">{e.label}</span>
                    <a href={`tel:${e.number}`} className="font-semibold text-error-700">{e.number}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Municipal Office</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-500">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                Kathmandu Metropolitan City, Bagdurbar, Kathmandu 44600
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary-600" />
                <a href="tel:+97714520000" className="hover:text-primary-600">+977 1 4520 000</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary-600" />
                <a href="mailto:info@kmc.gov.np" className="hover:text-primary-600">info@kmc.gov.np</a>
              </li>
              <li className="text-xs text-ink-400">Office hours: Sun–Fri, 10:00 AM – 5:00 PM</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-ink-100 pt-6 text-xs text-ink-500 sm:flex-row dark:border-ink-800">
          <p>© {new Date().getFullYear()} CivicLink — Smart Civic Complaint System. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-primary-600">Privacy Policy</Link>
            <Link to="/about" className="hover:text-primary-600">Terms of Service</Link>
            <Link to="/faq" className="hover:text-primary-600">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
