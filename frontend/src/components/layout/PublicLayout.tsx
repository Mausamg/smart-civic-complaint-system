import type { ReactNode } from 'react';
import { PublicNavbar } from './PublicNavbar';
import { Footer } from './Footer';
import '../../styles/civic.css';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cl-shell">
      <PublicNavbar />
      <main id="main-content" className="cl-main">{children}</main>
      <Footer />
    </div>
  );
}
