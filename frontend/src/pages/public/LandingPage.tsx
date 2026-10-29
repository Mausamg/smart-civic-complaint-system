import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Droplets,
  Lightbulb,
  MapPin,
  Recycle,
  Route,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

// The backend stores a category string; these are examples, not a server-provided list.
const categories = [
  { title: 'Roads & walkways', description: 'Potholes, damaged paths and unsafe crossings', Icon: Route },
  { title: 'Waste & sanitation', description: 'Uncollected rubbish and public cleanliness', Icon: Recycle },
  { title: 'Street lighting', description: 'Broken lights and poorly lit public spaces', Icon: Lightbulb },
  { title: 'Water & drainage', description: 'Leaks, blocked drains and flooding concerns', Icon: Droplets },
];

// Match the real ComplaintStatus workflow instead of displaying invented states.
const steps = [
  {
    number: '01',
    name: 'Submit a report',
    status: 'Submitted',
    description: 'Describe the problem and provide a location. Images can add useful context.',
    Icon: ClipboardList,
  },
  {
    number: '02',
    name: 'Receive a review',
    status: 'UnderReview',
    description: 'Your complaint enters a review stage before further action is taken.',
    Icon: ShieldCheck,
  },
  {
    number: '03',
    name: 'Follow the work',
    status: 'InProgress',
    description: 'See progress as the assigned staff member updates the complaint.',
    Icon: Wrench,
  },
  {
    number: '04',
    name: 'See the outcome',
    status: 'Resolved',
    description: 'View the outcome and status history when the issue is marked resolved.',
    Icon: CircleCheck,
  },
];

export function LandingPage() {
  return (
    <div className="cl-landing">
      <section className="cl-hero" aria-labelledby="cl-hero-title">
        <div className="cl-wrap cl-hero__layout">
          <div className="cl-hero__copy">
            <div className="cl-kicker">
              <span className="cl-kicker__line" />
              A better way to care for our communities
            </div>
            <h1 id="cl-hero-title" className="cl-display">
              Every street has a story.
              <span> Every voice deserves to be heard.</span>
            </h1>
            <p className="cl-hero__lead">
              Report everyday civic issues, understand their progress, and make
              neighbourhood improvements easier to follow. One clear place for
              citizens and the people working to resolve them.
            </p>
            <div className="cl-hero__actions">
              <Link className="cl-action cl-action--solid" to="/register">
                Create an account <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
              <a className="cl-action cl-action--text" href="#how-it-works">
                Explore how it works <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
            <div className="cl-hero__footnote">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>Currently a project prototype. Registration and reporting are not yet connected to the live API.</span>
            </div>
          </div>

          <div className="cl-scene" aria-label="Illustration of a sample neighbourhood complaint workflow">
            <div className="cl-scene__topline">
              <span>COMMUNITY / 01</span>
              <span>ILLUSTRATIVE WORKFLOW</span>
            </div>
            <div className="cl-scene__map" aria-hidden="true">
              <span className="cl-scene__street cl-scene__street--one" />
              <span className="cl-scene__street cl-scene__street--two" />
              <span className="cl-scene__street cl-scene__street--three" />
              <span className="cl-scene__block cl-scene__block--one" />
              <span className="cl-scene__block cl-scene__block--two" />
              <span className="cl-scene__block cl-scene__block--three" />
              <span className="cl-scene__block cl-scene__block--four" />
              <div className="cl-scene__marker cl-scene__marker--a"><MapPin size={20} /></div>
              <div className="cl-scene__marker cl-scene__marker--b"><Check size={21} /></div>
            </div>
            <div className="cl-scene__issue">
              <div className="cl-scene__issue-top">
                <span className="cl-label-mini">SAMPLE REPORT</span>
                <span className="cl-scene__issue-id">CASE / 001</span>
              </div>
              <div className="cl-scene__issue-title">A streetlight needs attention.</div>
              <div className="cl-scene__issue-bottom">
                <span><MapPin size={14} aria-hidden="true" /> Neighbourhood street</span>
                <span className="cl-scene__status">Under review</span>
              </div>
            </div>
            <div className="cl-scene__note">
              <span className="cl-scene__note-icon"><CircleCheck size={17} /></span>
              A clear path from report to response
            </div>
          </div>
        </div>
        <div className="cl-wrap cl-hero__bottom">
          <span>DESIGNED FOR TRANSPARENCY</span>
          <span>BUILT AROUND LOCAL NEEDS</span>
          <span>01 — 04</span>
        </div>
      </section>

      <section className="cl-intro cl-section" aria-labelledby="cl-intro-title">
        <div className="cl-wrap cl-intro__grid">
          <div className="cl-section-label"><span className="cl-section-label__dot" /> WHY CIVICLINK</div>
          <div>
            <h2 id="cl-intro-title" className="cl-heading">
              Small issues shouldn't be <em>hard to raise.</em>
            </h2>
            <p className="cl-body-large">
              A broken light. A damaged footpath. Waste that hasn't been collected.
              The problems are familiar; figuring out what happens next shouldn't be difficult.
              CivicLink brings reporting and follow-up into one understandable journey.
            </p>
            <div className="cl-intro__links">
              <Link to="/about">About the project <ArrowUpRight size={18} /></Link>
              <Link to="/faq">Common questions <ArrowUpRight size={18} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="cl-process cl-section" aria-labelledby="cl-process-title">
        <div className="cl-wrap">
          <div className="cl-process__head">
            <div>
              <div className="cl-section-label"><span className="cl-section-label__dot" /> THE PROCESS</div>
              <h2 id="cl-process-title" className="cl-heading">A report should never disappear into the unknown.</h2>
            </div>
            <p>Four meaningful stages, connected to the statuses implemented in our complaint-management backend.</p>
          </div>
          <div className="cl-process__steps">
            {steps.map(({ number, name, status, description, Icon }) => (
              <article className="cl-step" key={number}>
                <div className="cl-step__top">
                  <span className="cl-step__number">{number}</span>
                  <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
                </div>
                <h3>{name}</h3>
                <p>{description}</p>
                <span className="cl-step__status">{status.replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
              </article>
            ))}
          </div>
          <p className="cl-process__aside">Other supported outcomes include Rejected and Withdrawn. What you can do depends on your account role.</p>
        </div>
      </section>

      <section className="cl-categories cl-section" aria-labelledby="cl-categories-title">
        <div className="cl-wrap cl-categories__layout">
          <div className="cl-categories__intro">
            <div className="cl-section-label"><span className="cl-section-label__dot" /> EVERYDAY ISSUES</div>
            <h2 id="cl-categories-title" className="cl-heading">Notice something that needs care?</h2>
            <p className="cl-body-large">From roads to essential services, it starts with someone speaking up. Here are a few examples of the kinds of issues CivicLink is designed to handle.</p>
            <Link className="cl-text-link" to="/register">Start with an account <ArrowUpRight size={18} /></Link>
          </div>
          <div className="cl-categories__list">
            {categories.map(({ title, description, Icon }, index) => (
              <div className="cl-category" key={title}>
                <span className="cl-category__icon"><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span>
                <span className="cl-category__content"><strong>{title}</strong><small>{description}</small></span>
                <span className="cl-category__number">0{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cl-last" aria-labelledby="cl-last-title">
        <div className="cl-wrap cl-last__layout">
          <div>
            <div className="cl-section-label cl-section-label--light"><span className="cl-section-label__dot" /> A SHARED RESPONSIBILITY</div>
            <h2 id="cl-last-title">A more responsive neighbourhood starts with <em>one report.</em></h2>
          </div>
          <div className="cl-last__aside">
            <p>Give local concerns a place to be recorded, reviewed, and followed through — with clear roles for citizens, staff, and administrators.</p>
            <Link className="cl-action cl-action--light" to="/register">Get started <ChevronRight size={20} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
