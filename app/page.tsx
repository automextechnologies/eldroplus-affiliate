import AffiliateForm from "./components/AffiliateForm";
import PageEffects from "./components/PageEffects";

const SITE = "https://www.eldroplus.com";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a href={SITE} className="logo" id="header-logo-link" aria-label="Eldro+ home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${SITE}/assets/eldroplus_header_logo.png`} alt="Eldro+ logo" width={140} height={42} />
          </a>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="blob blob-1" aria-hidden="true" />
          <div className="blob blob-2" aria-hidden="true" />

          <div className="container hero-inner">
            <div className="hero-copy reveal">
              <h1>
                Stay healthy today.
                <br />
                Enjoy a <span className="accent">better tomorrow</span>.
              </h1>
            </div>

            <AffiliateForm />
          </div>
        </section>
      </main>

      <footer className="site-footer-minimal">
        <div className="container footer-minimal-inner">
          <nav className="footer-links" aria-label="Legal">
            <a href={`${SITE}/privacy-policy`} target="_blank" rel="noopener" id="footer-privacy-link">
              Privacy Policy
            </a>
            <span className="footer-sep" aria-hidden="true">•</span>
            <a href={`${SITE}/terms-conditions`} target="_blank" rel="noopener" id="footer-terms-link">
              Terms &amp; Conditions
            </a>
            <span className="footer-sep" aria-hidden="true">•</span>
            <a href={SITE} target="_blank" rel="noopener" id="footer-site-link">
              eldroplus.com
            </a>
          </nav>
          <p className="copyright">© Eldro+. All rights reserved.</p>
        </div>
      </footer>

      <PageEffects />
    </>
  );
}
