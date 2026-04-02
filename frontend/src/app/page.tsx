"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .home-root {
          min-height: 100vh;
          background: #0a0a0b;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: var(--font-dm-sans), sans-serif;
        }

        .glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .glow-top {
          width: 500px;
          height: 320px;
          background: radial-gradient(ellipse, rgba(160, 20, 50, 0.55) 0%, transparent 70%);
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
        }
        .glow-left {
          width: 320px;
          height: 320px;
          background: radial-gradient(ellipse, rgba(120, 15, 35, 0.3) 0%, transparent 70%);
          bottom: 10%;
          left: 5%;
        }
        .glow-right {
          width: 320px;
          height: 320px;
          background: radial-gradient(ellipse, rgba(120, 15, 35, 0.25) 0%, transparent 70%);
          bottom: 10%;
          right: 5%;
        }

        .content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 48px 24px;
          max-width: 960px;
          width: 100%;
          animation: fadeUp 0.7s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .logo-icon {
          position: relative;
          margin-bottom: 20px;
        }
        .logo-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(200, 30, 65, 0.55) 0%, transparent 70%);
          border-radius: 50%;
          z-index: -1;
        }

        .title {
          font-family: var(--font-syne), sans-serif;
          font-weight: 800;
          font-size: clamp(56px, 9vw, 88px);
          color: #ffffff;
          margin: 0 0 10px;
          letter-spacing: -2px;
          line-height: 1;
        }

        .subtitle {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: clamp(16px, 2.5vw, 20px);
          color: rgba(255, 255, 255, 0.72);
          margin: 0 0 16px;
          font-weight: 400;
        }

        .description {
          font-size: clamp(13px, 1.8vw, 15px);
          color: rgba(255, 255, 255, 0.38);
          max-width: 560px;
          line-height: 1.75;
          margin: 0 0 52px;
        }

        .cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          width: 100%;
        }

        .card {
          background: #12141d;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 20px;
          padding: 32px 28px 40px;
          text-align: left;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
        }

        .card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 15% 15%, rgba(160, 20, 50, 0.13) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .card:hover {
          transform: translateY(-5px);
          border-color: rgba(180, 30, 60, 0.4);
          box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(180,30,60,0.12);
        }

        .card:hover::before { opacity: 1; }
        .card:active { transform: translateY(-1px); }

        .card-icon {
          width: 58px;
          height: 58px;
          background: linear-gradient(145deg, #c01845 0%, #820f2e 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
          box-shadow: 0 6px 24px rgba(160, 20, 50, 0.45);
        }

        .card-title {
          font-family: var(--font-syne), sans-serif;
          font-weight: 700;
          font-size: 26px;
          color: #ffffff;
          margin: 0 0 10px;
        }

        .card-description {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.65;
          margin: 0;
          max-width: 280px;
        }

        .card-arrow {
          position: absolute;
          bottom: 28px;
          right: 28px;
          color: rgba(255,255,255,0.18);
          font-size: 20px;
          transition: color 0.2s ease, transform 0.2s ease;
        }

        .card:hover .card-arrow {
          color: rgba(255,255,255,0.55);
          transform: translateX(4px);
        }

        @media (max-width: 600px) {
          .cards { grid-template-columns: 1fr; }
        }
      `}</style>

      <main className="home-root">
        <div className="glow glow-top" />
        <div className="glow glow-left" />
        <div className="glow glow-right" />

        <div className="content">
          {/* Music note logo */}
          <div className="logo-icon">
            <svg width="56" height="68" viewBox="0 0 56 68" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="38" y1="8" x2="38" y2="46" stroke="white" strokeWidth="4.5" strokeLinecap="round"/>
              <path d="M38 8 C50 12, 54 22, 46 28" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <ellipse cx="30" cy="48" rx="9" ry="7" fill="white" transform="rotate(-15 30 48)"/>
            </svg>
            <div className="logo-glow" />
          </div>

          <h1 className="title">PlayD</h1>
          <p className="subtitle">Crowd-Powered DJ Requests</p>
          <p className="description">
            Transform live events with seamless song requests. Guests browse and
            request, DJs manage the perfect queue.
          </p>

          <div className="cards">
            {/* Guest Card */}
            <button className="card" onClick={() => router.push("/guest/login")}>
              <div className="card-icon">
                <svg width="26" height="30" viewBox="0 0 26 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="17" y1="3" x2="17" y2="20" stroke="white" strokeWidth="2.8" strokeLinecap="round"/>
                  <path d="M17 3 C23 5, 25 11, 21 14" stroke="white" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
                  <ellipse cx="10" cy="22" rx="6" ry="4.5" fill="white" transform="rotate(-10 10 22)"/>
                </svg>
              </div>
              <h2 className="card-title">Guest</h2>
              <p className="card-description">
                Request your favorite songs and watch them come to life
              </p>
              <div className="card-arrow">→</div>
            </button>

            {/* DJ Card */}
            <button className="card" onClick={() => router.push("/dj/login")}>
              <div className="card-icon">
                <svg width="28" height="26" viewBox="0 0 28 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 14 C4 7, 10 2, 14 2 C18 2, 24 7, 24 14" stroke="white" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
                  <rect x="1" y="13" width="6" height="9" rx="3" fill="white"/>
                  <rect x="21" y="13" width="6" height="9" rx="3" fill="white"/>
                </svg>
              </div>
              <h2 className="card-title">DJ</h2>
              <p className="card-description">
                Manage requests and control your perfect set
              </p>
              <div className="card-arrow">→</div>
            </button>
          </div>
        </div>
      </main>
    </>
  );
}