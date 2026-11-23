import { Link } from 'react-router-dom';
import { usePlans, formatINR } from '../hooks/usePlans';
import { ArrowRight, Check } from 'lucide-react';
import ConstructHubLogo from '../components/common/ConstructHubLogo';
import heroCraneImg from '../assets/hero-crane.jpg';
import towerFacadeImg from '../assets/tower-facade.jpg';
import commercialComplexImg from '../assets/commercial-complex.jpg';

const MODULES = [
  { num: '01', title: '3-Role Bid Estimation', desc: 'Project Managers define milestone stages, Finance Managers price internal site costs, and Company Admins sync markup or target client quotes.' },
  { num: '02', title: 'Mobilization Advance Gate', desc: 'Awarding a quotation auto-generates the work order, locks milestones, and holds field work until the advance bill is settled.' },
  { num: '03', title: '3-Way PO & Site Stock', desc: 'Bulk material requests flow through PM approval, Storekeeper purchase orders, goods receipts (GRNs), and task-level stock issues.' },
  { num: '04', title: 'Daily Site Proof & Sign-Off', desc: 'Site Engineers log weather, labor counts, consumed stock, and site photos before Project Managers verify any completed stage.' },
  { num: '05', title: 'Stage RA Billing & Top-Ups', desc: 'Auto-calculated milestone invoices with proportional mobilization advance recovery, attached site reports, and profit-reserve budget top-ups.' },
];

export default function LandingHome() {
  const { planPrices, planLimits, projLimits } = usePlans();

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      <div className="lp-shell">

        {/* Rounded Daylight Hero Banner */}
        <section className="lp-hero-frame">
          <img src={heroCraneImg} alt="Construction tower crane against sunlit sky" className="lp-hero-img" />
          <div className="lp-hero-scrim" />
          <div className="lp-hero-top-scrim" />

          {/* Floating Navbar inside Hero */}
          <header className="lp-hero-nav">
            <Link to="/" className="lp-brand-link" aria-label="ConstructHub Home">
              <ConstructHubLogo size={34} textSize={18} />
            </Link>

            <nav className="lp-glass-pill" aria-label="Primary navigation">
              <a href="#about">About</a>
              <a href="#projects">Projects</a>
              <a href="#modules">Modules</a>
              <a href="#pricing">Plans</a>
              <Link to="/contact">Contact</Link>
            </nav>

            <div className="lp-nav-actions">
              <Link to="/register-client" className="btn btn-secondary btn-sm lp-nav-ghost">
                Client Sign Up
              </Link>
              <Link to="/login" className="btn btn-primary btn-sm">
                Sign In
              </Link>
            </div>
          </header>

          {/* Hero Main Copy + Floating Glass Preview Card */}
          <div className="lp-hero-content">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow">
                <span className="lp-eyebrow-dot" />
                Tendering, Site Operations &amp; Stage Billing
              </p>
              <h1 className="lp-hero-title">
                Your trusted platform for modern construction.
              </h1>
              <p className="lp-hero-sub">
                We unite project owners, estimators, project managers, storekeepers, site engineers, and finance teams in one transparent workspace—from tender to verified stage billing.
              </p>
              <div className="lp-hero-cta-row">
                <Link to="/login" className="lp-pill-cta">
                  <span>Open Workspace</span>
                  <span className="lp-pill-arrow"><ArrowRight size={15} /></span>
                </Link>
                <Link to="/contact?request=firm" className="lp-pill-secondary">
                  Request Firm Onboarding
                </Link>
              </div>
            </div>

            {/* Bottom-Right Floating Glass Preview Card */}
            <div className="lp-hero-card-wrap">
              <div className="lp-hero-preview-card">
                <div className="lp-hero-preview-media">
                  <img src={towerFacadeImg} alt="Apex Skyline Tower" />
                  <span className="lp-hero-preview-badge">40% Verified</span>
                </div>
                <div className="lp-hero-preview-body">
                  <div className="lp-hero-preview-head">
                    <span className="lp-hero-preview-title">Apex Skyline Tower</span>
                    <span className="lp-hero-preview-val">₹3.125 Cr</span>
                  </div>
                  <p className="lp-hero-preview-meta">
                    Foundation approved · Site Report R001 attached.
                  </p>
                  <div className="lp-hero-preview-bar">
                    <div className="lp-hero-preview-bar-fill" style={{ width: '40%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Asymmetric Editorial Intro */}
        <section id="about" className="lp-about">
          <div className="lp-about-label-col">
            <span className="lp-section-kicker">
              <span className="lp-eyebrow-dot" />
              About ConstructHub
            </span>
          </div>
          <div className="lp-about-body-col">
            <h2 className="lp-about-statement">
              Delivering project owners and construction firms more project clarity, tighter financial control, and less chaos. Every tender stage, purchase order, site log, and milestone invoice stays connected across all 7 roles.
            </h2>
            <div className="lp-about-stats">
              <div>
                <div className="lp-about-stat-val">7 Roles</div>
                <div className="lp-about-stat-lbl">Dedicated operational portals</div>
              </div>
              <div>
                <div className="lp-about-stat-val">4-Phase</div>
                <div className="lp-about-stat-lbl">Tender-to-RA-bill lifecycle</div>
              </div>
              <div>
                <div className="lp-about-stat-val">100%</div>
                <div className="lp-about-stat-lbl">Site-proof verified billing</div>
              </div>
            </div>
          </div>
        </section>

        {/* Alternating Active Projects Showcase */}
        <section id="projects" className="lp-section">
          <div className="lp-section-head">
            <p className="lp-section-eyebrow">Live Platform Portfolio</p>
            <h2 className="lp-section-title">Active projects on ConstructHub</h2>
          </div>

          <div className="lp-project-row">
            <div className="lp-project-info">
              <div>
                <div className="lp-project-title-row">
                  <h3>Apex Skyline Tower</h3>
                  <span className="badge badge-orange">On Track</span>
                </div>
                <p className="lp-project-desc">High-rise luxury residential tower · Contract WO-CON001</p>
                <p className="lp-project-loc">Mumbai, Maharashtra</p>
              </div>
              <div className="lp-project-metrics">
                <div><div className="lp-metric-lbl">Contract Value</div><div className="lp-metric-val">₹3.125 Cr</div></div>
                <div><div className="lp-metric-lbl">Client</div><div className="lp-metric-val">Vikram Patel</div></div>
                <div><div className="lp-metric-lbl">Mobilization</div><div className="lp-metric-val" style={{ color: 'var(--green)' }}>10% Paid</div></div>
                <div><div className="lp-metric-lbl">Duration</div><div className="lp-metric-val">180 Days</div></div>
              </div>
            </div>
            <div className="lp-project-photo">
              <img src={towerFacadeImg} alt="Apex Skyline Tower" />
            </div>
          </div>

          <div className="lp-project-row rev">
            <div className="lp-project-photo">
              <img src={commercialComplexImg} alt="Apex Commercial Complex" style={{ objectPosition: 'center center' }} />
            </div>
            <div className="lp-project-info">
              <div>
                <div className="lp-project-title-row">
                  <h3>Apex Commercial Complex</h3>
                  <span className="badge badge-orange">MEP Stage</span>
                </div>
                <p className="lp-project-desc">Modern IT &amp; retail commercial complex · Contract WO-CON002</p>
                <p className="lp-project-loc">Pune, Maharashtra</p>
              </div>
              <div className="lp-project-metrics">
                <div><div className="lp-metric-lbl">Contract Value</div><div className="lp-metric-val">₹5.04 Cr</div></div>
                <div><div className="lp-metric-lbl">Client</div><div className="lp-metric-val">Suresh Shah</div></div>
                <div><div className="lp-metric-lbl">Company Margin</div><div className="lp-metric-val">20% Derived</div></div>
                <div><div className="lp-metric-lbl">Duration</div><div className="lp-metric-val">150 Days</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* Deep Navy Rounded Modules Section */}
        <section id="modules" className="lp-modules-band">
          <div className="lp-modules-grid">
            <div className="lp-modules-intro">
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: '#fb923c', marginBottom: 10 }}>Platform Architecture</p>
                <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(28px, 2.8vw, 36px)', fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.025em' }}>
                  Explore our modules
                </h2>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 20, lineHeight: 1.65 }}>
                Dedicated portals for Superuser, Company Admin, Project Manager, Finance Manager, Storekeeper, Site Engineer, and Client.
              </p>
            </div>

            {MODULES.map((m) => (
              <div key={m.num} className="lp-module-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 500, color: '#cbd5e1' }}>{m.num}</span>
                </div>
                <div style={{ marginTop: 22 }}>
                  <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 6, color: '#0f172a' }}>{m.title}</h3>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Clean SaaS Plans Section */}
        <section id="pricing" className="lp-section" style={{ paddingBottom: 24 }}>
          <div className="lp-section-head" style={{ marginBottom: 36 }}>
            <p className="lp-section-eyebrow">Firm Subscriptions</p>
            <h2 className="lp-section-title">Predictable workspace plans</h2>
          </div>

          <div className="plan-grid">
            <div className="plan-card">
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Boutique Contractors</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600, marginTop: 4 }}>Basic Plan</div>
                <div className="plan-price">{formatINR(planPrices.Basic)}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}> / mo</span></div>
                <ul className="plan-features">
                  <li><Check size={15} color="var(--green)" /> Up to {planLimits.Basic} Team Members</li>
                  <li><Check size={15} color="var(--green)" /> Up to {projLimits.Basic} Active Projects</li>
                  <li><Check size={15} color="var(--green)" /> 3-Role Bid Estimation &amp; RA Billing</li>
                </ul>
              </div>
              <Link to="/contact?plan=Basic" className="btn btn-secondary btn-full">Get Started</Link>
            </div>

            <div className="plan-card active-plan">
              <span className="plan-badge-top">Popular</span>
              <div>
                <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Regional Developers</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600, marginTop: 4 }}>Pro Plan</div>
                <div className="plan-price">{formatINR(planPrices.Pro)}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}> / mo</span></div>
                <ul className="plan-features">
                  <li><Check size={15} color="var(--green)" /> Up to {planLimits.Pro} Team Members</li>
                  <li><Check size={15} color="var(--green)" /> Up to {projLimits.Pro} Active Projects</li>
                  <li><Check size={15} color="var(--green)" /> 3-Way PO, GRN &amp; Site Stock Ledger</li>
                  <li><Check size={15} color="var(--green)" /> Budget Top-Up &amp; Overage Protection</li>
                </ul>
              </div>
              <Link to="/contact?plan=Pro" className="btn btn-primary btn-full">Choose Pro</Link>
            </div>

            <div className="plan-card">
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Infrastructure EPC</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600, marginTop: 4 }}>Enterprise Plan</div>
                <div className="plan-price">{formatINR(planPrices.Enterprise)}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}> / mo</span></div>
                <ul className="plan-features">
                  <li><Check size={15} color="var(--green)" /> Up to {planLimits.Enterprise} Team Members</li>
                  <li><Check size={15} color="var(--green)" /> Up to {projLimits.Enterprise} Active Projects</li>
                  <li><Check size={15} color="var(--green)" /> Custom Domain &amp; Full Audit Controls</li>
                </ul>
              </div>
              <Link to="/contact?plan=Enterprise" className="btn btn-secondary btn-full">Contact Sales</Link>
            </div>
          </div>
        </section>

        {/* Photographic Rounded CTA Banner */}
        <section className="lp-cta-banner">
          <img src={towerFacadeImg} alt="Modern building facade" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,21,38,0.52) 0%, rgba(8,21,38,0.8) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 10, maxWidth: 560 }}>
            <p style={{ fontSize: 12.5, color: '#fed7aa', fontWeight: 600, marginBottom: 10 }}>Ready to start?</p>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(28px, 3.2vw, 38px)', fontWeight: 500, color: '#ffffff', lineHeight: 1.15, marginBottom: 24 }}>
              Ready to build with clarity? Open your workspace today.
            </h2>
            <Link to="/login" className="lp-pill-cta">
              <span>Sign In to Workspace</span>
              <span className="lp-pill-arrow"><ArrowRight size={15} /></span>
            </Link>
          </div>
        </section>

        {/* Minimalist White Footer */}
        <footer className="lp-footer">
          <div>
            <div style={{ marginBottom: 8 }}>
              <ConstructHubLogo size={28} textSize={15} />
            </div>
            <p>Specialized in transparent, milestone-locked construction project and financial operations.</p>
          </div>
          <div className="lp-footer-links">
            <Link to="/login">Sign In</Link>
            <Link to="/register-client">Client Sign Up</Link>
            <Link to="/contact?request=firm">Onboard Firm</Link>
            <span>© 2026 ConstructHub</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
