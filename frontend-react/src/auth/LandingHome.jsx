import React from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat,
  ArrowRight,
  ShieldCheck,
  Building2,
  FolderKanban,
  CheckCircle2,
  Receipt,
  Users,
  Wallet,
  Clock,
  TrendingUp,
  Phone,
  Mail
} from 'lucide-react';

export default function LandingHome() {
  return (
    <div>
      {/* Landing Navbar */}
      <nav className="landing-nav">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
            <HardHat size={28} />
          </div>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '24px' }}>
            ConstructHub
          </span>
        </Link>

        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#roles">Roles</a>
          <a href="#pricing">Pricing</a>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div className="landing-nav-actions">
          <Link to="/login" className="btn btn-secondary btn-sm">
            Sign In
          </Link>
          <Link to="/contact?request=firm" className="btn btn-primary btn-sm">
            Contact Us <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-tag">
            <span className="dot"></span>
            Enterprise Construction Management Platform
          </div>
          <h1>
            Build Smarter.<br />
            Manage Better.<br />
            <span>Deliver Faster.</span>
          </h1>
          <p>
            The all-in-one construction project and financial operations platform designed
            to streamline workflows across executives, project managers, engineers, and clients.
          </p>
          <div className="hero-cta">
            <Link to="/login" className="btn btn-primary">
              Open Workspace <ArrowRight size={16} />
            </Link>
            <Link to="/contact?request=firm" className="btn btn-secondary">
              Request Workspace
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="num">500+</div>
              <div className="lbl">Active Projects</div>
            </div>
            <div className="hero-stat">
              <div className="num" style={{ color: 'var(--blue)' }}>98%</div>
              <div className="lbl">On-Time Milestones</div>
            </div>
            <div className="hero-stat">
              <div className="num" style={{ color: 'var(--green)' }}>50K+</div>
              <div className="lbl">Daily Site Logs</div>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(249,115,22,0.12), 0 4px 20px rgba(0,0,0,0.08)',
              width: '460px',
              padding: '24px',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-green">LIVE PROJECT</span>
                <strong style={{ fontSize: '13px' }}>Apex Skyline Tower</strong>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mumbai, MH</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Budget</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>₹2.50Cr</div>
              </div>
              <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Progress</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 800, color: 'var(--green)' }}>75%</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Milestone: Block A Concrete Pouring</span>
                <strong>Completed</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '75%', background: 'var(--primary)' }}></div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Assigned Engineer: Priya Sharma</span>
              <span>Due: Apr 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <h2>Built for Modern Construction Companies</h2>
        <p className="sub">Everything your firm needs to coordinate construction projects seamlessly.</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon-box icon-box-orange" style={{ marginBottom: '12px' }}>
              <FolderKanban size={20} />
            </div>
            <h3>Project & Milestone Tracking</h3>
            <p>Coordinate timelines, assign tasks to site engineers, and track real-time progress percentages with visual gauges.</p>
          </div>
          <div className="feature-card">
            <div className="icon-box icon-box-green" style={{ marginBottom: '12px' }}>
              <Receipt size={20} />
            </div>
            <h3>Automated Invoicing & Approvals</h3>
            <p>Finance managers generate milestone bills and send invoices directly to clients for approval or rejection with audit logs.</p>
          </div>
          <div className="feature-card">
            <div className="icon-box icon-box-blue" style={{ marginBottom: '12px' }}>
              <ShieldCheck size={20} />
            </div>
            <h3>Daily Site Logging & Photos</h3>
            <p>Site engineers upload daily progress reports, material usage logs, and high-resolution site inspection photos from the field.</p>
          </div>
          <div className="feature-card">
            <div className="icon-box icon-box-purple" style={{ marginBottom: '12px' }}>
              <Wallet size={20} />
            </div>
            <h3>Budget Allocation & Control</h3>
            <p>Categorize budgets across Labor, Materials, Equipment, and Other with automatic overage detection and expense alerts.</p>
          </div>
          <div className="feature-card">
            <div className="icon-box icon-box-orange" style={{ marginBottom: '12px' }}>
              <Users size={20} />
            </div>
            <h3>Multi-Tenant Firm Workspaces</h3>
            <p>Each construction company gets a dedicated branded tenant with custom approved domain enforcement and role quotas.</p>
          </div>
          <div className="feature-card">
            <div className="icon-box icon-box-green" style={{ marginBottom: '12px' }}>
              <TrendingUp size={20} />
            </div>
            <h3>Real-Time Communications</h3>
            <p>Integrated team messaging and push notifications keep field engineers, office staff, and clients constantly aligned.</p>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="roles-section" id="roles">
        <h2>Dedicated Experiences for Every Stakeholder</h2>
        <p className="sub">Six specialized actor environments tailored to specific operational responsibilities.</p>
        <div className="roles-grid">
          <div className="role-card">
            <div className="icon-box icon-box-orange" style={{ margin: '0 auto 12px' }}>
              <ShieldCheck size={22} />
            </div>
            <h3>Platform Super Admin</h3>
            <div className="role-feature">Multi-company governance</div>
            <div className="role-feature">Platform SaaS revenue tracking</div>
            <div className="role-feature">Contact inquiry management</div>
          </div>
          <div className="role-card">
            <div className="icon-box icon-box-orange" style={{ margin: '0 auto 12px' }}>
              <Building2 size={22} />
            </div>
            <h3>Company Admin</h3>
            <div className="role-feature">Team member onboarding</div>
            <div className="role-feature">SaaS subscription & overage billing</div>
            <div className="role-feature">Firm-wide project oversight</div>
          </div>
          <div className="role-card">
            <div className="icon-box icon-box-blue" style={{ margin: '0 auto 12px' }}>
              <FolderKanban size={22} />
            </div>
            <h3>Project Manager</h3>
            <div className="role-feature">Project creation & allocation</div>
            <div className="role-feature">Task assignment to engineers</div>
            <div className="role-feature">Review site logs & reports</div>
          </div>
          <div className="role-card">
            <div className="icon-box icon-box-green" style={{ margin: '0 auto 12px' }}>
              <HardHat size={22} />
            </div>
            <h3>Site Engineer</h3>
            <div className="role-feature">Daily task status updating</div>
            <div className="role-feature">Site report submission</div>
            <div className="role-feature">Material logs & photo upload</div>
          </div>
          <div className="role-card">
            <div className="icon-box icon-box-purple" style={{ margin: '0 auto 12px' }}>
              <Receipt size={22} />
            </div>
            <h3>Finance Manager</h3>
            <div className="role-feature">Project budget categorization</div>
            <div className="role-feature">Milestone invoice generation</div>
            <div className="role-feature">Expense tracking & payment decisions</div>
          </div>
          <div className="role-card">
            <div className="icon-box icon-box-orange" style={{ margin: '0 auto 12px' }}>
              <Users size={22} />
            </div>
            <h3>Client</h3>
            <div className="role-feature">Project progress transparency</div>
            <div className="role-feature">One-click invoice payment approval</div>
            <div className="role-feature">Direct team feedback & messaging</div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section" id="pricing">
        <h2>Predictable Subscription Plans</h2>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-name">Basic Plan</div>
            <div className="pricing-price">₹4,999<span className="pricing-period"> / mo</span></div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>For boutique construction contractors</p>
            <div className="pricing-features">
              <div className="pricing-feature">Up to 10 Team Members</div>
              <div className="pricing-feature">Up to 3 Active Projects</div>
              <div className="pricing-feature">Site Logging & Photo Upload</div>
              <div className="pricing-feature">Standard Invoicing</div>
            </div>
            <Link to="/contact?plan=Basic" className="btn btn-secondary btn-full">
              Get Started
            </Link>
          </div>

          <div className="pricing-card featured">
            <div className="pricing-name">Pro Plan</div>
            <div className="pricing-price">₹9,999<span className="pricing-period"> / mo</span></div>
            <p style={{ fontSize: '13px', opacity: 0.85 }}>For growing regional construction firms</p>
            <div className="pricing-features">
              <div className="pricing-feature">Up to 50 Team Members</div>
              <div className="pricing-feature">Up to 15 Active Projects</div>
              <div className="pricing-feature">Budget Tracking & Categories</div>
              <div className="pricing-feature">Usage Overage Protection</div>
              <div className="pricing-feature">Priority Support</div>
            </div>
            <Link to="/contact?plan=Pro" className="btn btn-secondary btn-full" style={{ background: 'white', color: 'var(--primary)' }}>
              Choose Pro
            </Link>
          </div>

          <div className="pricing-card">
            <div className="pricing-name">Enterprise Plan</div>
            <div className="pricing-price">₹19,999<span className="pricing-period"> / mo</span></div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>For large infrastructure developers</p>
            <div className="pricing-features">
              <div className="pricing-feature">Up to 500 Team Members</div>
              <div className="pricing-feature">Up to 100 Active Projects</div>
              <div className="pricing-feature">Full Financial Operations</div>
              <div className="pricing-feature">Custom Domain Integration</div>
              <div className="pricing-feature">Dedicated Success Manager</div>
            </div>
            <Link to="/contact?plan=Enterprise" className="btn btn-secondary btn-full">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Streamline Your Construction Operations?</h2>
        <p>Join top construction and infrastructure developers managing projects with ConstructHub.</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link to="/contact?request=firm" className="btn btn-primary" style={{ padding: '12px 28px' }}>
            Request Firm Workspace
          </Link>
          <Link to="/contact" className="btn btn-secondary" style={{ padding: '12px 28px', background: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
            Speak with Sales
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <HardHat size={22} color="var(--primary)" />
              <strong style={{ fontFamily: 'var(--font-head)', fontSize: '18px', color: 'white' }}>ConstructHub</strong>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.6, maxWidth: '280px', color: 'rgba(255,255,255,0.6)' }}>
              The comprehensive construction and project lifecycle platform engineered for modern developers.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#roles">Role Environments</a>
            <a href="#pricing">Pricing Plans</a>
          </div>
          <div>
            <h4>Portals</h4>
            <Link to="/login">Sign In</Link>
            <Link to="/contact?request=firm">Request Firm Onboarding</Link>
            <Link to="/contact">Contact Sales</Link>
          </div>
          <div>
            <h4>Contact</h4>
            <span style={{ display: 'block', fontSize: '13px', margin: '5px 0', color: 'rgba(255,255,255,0.6)' }}>+91 98765 43210</span>
            <span style={{ display: 'block', fontSize: '13px', margin: '5px 0', color: 'rgba(255,255,255,0.6)' }}>sales@constructhub.com</span>
            <span style={{ display: 'block', fontSize: '13px', margin: '5px 0', color: 'rgba(255,255,255,0.6)' }}>Mumbai, India</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 ConstructHub. All rights reserved.</span>
          <span>Construction Project & Financial Operations Management Platform</span>
        </div>
      </footer>
    </div>
  );
}
