import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FaTag, FaClock } from "react-icons/fa";
import "./Offers.css";

const PARTICLES = [
  { left: "12%", top: "35%", size: 8,  delay: 0,   dur: 4.5 },
  { left: "28%", top: "65%", size: 11, delay: 0.9, dur: 5.1 },
  { left: "52%", top: "22%", size: 6,  delay: 0.4, dur: 4.0 },
  { left: "72%", top: "58%", size: 10, delay: 1.4, dur: 5.4 },
  { left: "87%", top: "38%", size: 7,  delay: 0.7, dur: 4.3 },
  { left: "42%", top: "78%", size: 9,  delay: 1.1, dur: 4.9 },
  { left: "63%", top: "12%", size: 13, delay: 0.3, dur: 5.7 },
  { left: "20%", top: "82%", size: 7,  delay: 1.6, dur: 4.2 },
  { left: "93%", top: "68%", size: 10, delay: 0.6, dur: 5.0 },
];

function useCountdown() {
  const getTimeLeft = () => {
    const now = new Date();
    const end = new Date();
    end.setHours(24, 0, 0, 0);
    const diff = Math.max(0, end - now);
    return {
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(getTimeLeft);
  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState({});
  const cardRefs = useRef([]);
  const astroRef = useRef(null);
  const acTextRef = useRef(null);
  const particleRefs = useRef([]);
  const { h, m, s } = useCountdown();

  const offers = [
    {
      title: "Half Price Sale",
      description: "Premium units at 50% off — limited time only.",
      imageSrc: "/images/offer-summer02.png",
      linkTo: "/search?category=all&query=all&price=all&discount=50&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Shop Now",
      discount: "50% OFF",
      soldPct: 78,
      label: "🌸 Summer Deal",
      hot: true,
    },
    {
      title: "Up to 40% Off",
      description: "Save big on select HVAC units — 31-40% discount on top brands.",
      imageSrc: "/images/offer-summer01.png",
      linkTo: "/search?category=all&query=all&price=all&discount=31-40&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Shop Now",
      discount: "40% OFF",
      soldPct: 55,
      label: "🌼 Summer Flash",
    },
    {
      title: "Smart Savings",
      description: "Quality units with 21-30% off — best value for your budget.",
      imageSrc: "/images/offer02.png",
      linkTo: "/search?category=all&query=all&price=all&discount=21-30&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "View Deals",
      discount: "30% OFF",
      soldPct: 42,
    },
    {
      title: "Top-Rated Picks",
      description: "5-star rated units with 10-20% off — comfort guaranteed.",
      imageSrc: "/images/offer-summer03.png",
      linkTo: "/search?category=all&query=all&price=all&discount=10-20&rating=5&btu=all&brand=all&order=newest&page=1",
      linkText: "Shop Now",
      discount: "20% OFF",
      soldPct: 33,
      label: "\u2B50 Top Rated",
    },
    {
      title: "Premium Systems",
      description: "High-end HVAC systems $1,000+ — professional grade equipment.",
      imageSrc: "/images/offer01.jpg",
      linkTo: "/search?category=all&query=all&price=1001-10000&discount=any&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Explore Now",
      discount: "NEW",
      soldPct: 20,
      label: "\uD83D\uDC8E Premium",
    },
    {
      title: "Best Sellers",
      description: "Most popular 4-star+ rated units — trusted by thousands.",
      imageSrc: "/images/offer03.png",
      linkTo: "/search?category=all&query=all&price=all&discount=any&rating=4&btu=all&brand=all&order=toprated&page=1",
      linkText: "Top Rated",
      discount: "UP TO 40%",
      soldPct: 61,
      label: "\uD83C\uDFC6 Best Seller",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting)
            setVisible((prev) => ({ ...prev, [e.target.dataset.idx]: true }));
        });
      },
      { threshold: 0.12 }
    );
    cardRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [loading]);

  const pad = (n) => String(n).padStart(2, "0");

  // JS-driven pulse — works regardless of CSS cascade / overflow clipping
  useEffect(() => {
    const el = astroRef.current;
    const acEl = acTextRef.current;
    if (!el) return;
    let raf;
    const duration = 3000;
    const acDuration = 1200; // faster independent pulse for AC text
    const start = performance.now();
    const tick = (now) => {
      const t = ((now - start) % duration) / duration;
      const ease = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
      const scale = 0.94 + ease * 0.1;
      const opacity = 0.55 + ease * 0.4;
      el.style.transform = `scale(${scale.toFixed(4)})`;
      el.style.opacity = opacity.toFixed(4);
      // AC text: faster pulse, opposite phase
      if (acEl) {
        const tAc = ((now - start) % acDuration) / acDuration;
        const easeAc = 0.5 - 0.5 * Math.cos(2 * Math.PI * tAc);
        acEl.style.opacity = (0.35 + easeAc * 0.65).toFixed(4);
        acEl.style.fontSize = `${(6.5 + easeAc * 1.5).toFixed(2)}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // JS-driven particle pulse
  useEffect(() => {
    const els = particleRefs.current.filter(Boolean);
    if (!els.length) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      els.forEach((el, i) => {
        const dur = 4000 + i * 600; // stagger each bubble
        const offset = i * 0.37;    // phase offset per bubble
        const t = (((now - start) / dur) + offset) % 1;
        const ease = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
        el.style.opacity = (0.08 + ease * 0.38).toFixed(3);
        const s = (0.85 + ease * 0.35).toFixed(3);
        el.style.transform = `scale(${s})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="of-page">
      {/* Hero */}
      <div className="of-hero">
        {/* Astronaut — absolute inside hero, left side */}
        <div className="of-hero__astronaut" ref={astroRef} aria-hidden="true">
          <svg className="of-astro" viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
            {/* Jetpack */}
            <rect x="38" y="95" width="14" height="22" rx="4" fill="#0f766e" />
            <rect x="68" y="95" width="14" height="22" rx="4" fill="#0f766e" />
            <ellipse cx="45" cy="118" rx="5" ry="7" fill="#5eead4" opacity="0.9" className="of-astro__flame of-astro__flame--l" />
            <ellipse cx="75" cy="118" rx="5" ry="7" fill="#5eead4" opacity="0.9" className="of-astro__flame of-astro__flame--r" />
            {/* Body */}
            <rect x="35" y="78" width="50" height="42" rx="14" fill="#0d9488" />
            <rect x="42" y="84" width="36" height="28" rx="8" fill="#2dd4bf" />
            {/* Chest badge */}
            <rect x="50" y="90" width="20" height="14" rx="3" fill="#0f766e" />
            <text ref={acTextRef} x="60" y="101" textAnchor="middle" fontSize="7" fill="#ccfbf1" fontWeight="bold">AC</text>
            {/* Helmet */}
            <ellipse cx="60" cy="62" rx="26" ry="28" fill="#99f6e4" />
            {/* Visor */}
            <ellipse cx="60" cy="62" rx="18" ry="20" fill="#0f766e" opacity="0.85" />
            <ellipse cx="60" cy="62" rx="18" ry="20" fill="url(#visorGradTeal)" opacity="0.6" />
            {/* Visor glare */}
            <ellipse cx="52" cy="54" rx="5" ry="7" fill="#fff" opacity="0.28" transform="rotate(-20 52 54)" />
            {/* Eyes */}
            <circle cx="54" cy="62" r="3.5" fill="#ccfbf1" />
            <circle cx="66" cy="62" r="3.5" fill="#ccfbf1" />
            <circle cx="55" cy="61" r="1.2" fill="#0f766e" />
            <circle cx="67" cy="61" r="1.2" fill="#0f766e" />
            {/* Smile */}
            <path d="M53 70 Q60 76 67 70" stroke="#ccfbf1" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Helmet ring */}
            <ellipse cx="60" cy="36" rx="18" ry="4" fill="none" stroke="#2dd4bf" strokeWidth="2" />
            {/* Left arm */}
            <rect x="18" y="82" width="18" height="10" rx="5" fill="#0d9488" transform="rotate(-20 18 82)" />
            <circle cx="14" cy="96" r="7" fill="#0d9488" />
            {/* Right arm */}
            <rect x="84" y="82" width="18" height="10" rx="5" fill="#0d9488" transform="rotate(20 84 82)" />
            <circle cx="106" cy="96" r="7" fill="#0d9488" />
            {/* Tag in right hand */}
            <rect x="108" y="88" width="16" height="12" rx="3" fill="#0f766e" />
            <text x="116" y="98" textAnchor="middle" fontSize="6" fill="#ccfbf1" fontWeight="bold">%</text>
            {/* Legs */}
            <rect x="44" y="118" width="13" height="22" rx="6" fill="#0d9488" />
            <rect x="63" y="118" width="13" height="22" rx="6" fill="#0d9488" />
            <ellipse cx="50" cy="140" rx="9" ry="5" fill="#0f766e" />
            <ellipse cx="69" cy="140" rx="9" ry="5" fill="#0f766e" />
            {/* Stars */}
            <text x="8" y="28" fontSize="10" fill="#2dd4bf" className="of-astro__star of-astro__star--1">★</text>
            <text x="100" y="22" fontSize="8" fill="#5eead4" className="of-astro__star of-astro__star--2">✦</text>
            <text x="14" y="130" fontSize="7" fill="#2dd4bf" className="of-astro__star of-astro__star--3">✦</text>
            <defs>
              <radialGradient id="visorGradTeal" cx="40%" cy="35%">
                <stop offset="0%" stopColor="#5eead4" />
                <stop offset="100%" stopColor="#0f766e" />
              </radialGradient>
            </defs>
          </svg>
        </div>
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            ref={(el) => (particleRefs.current[i] = el)}
            className="of-particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
            }}
          />
        ))}
        <div className="of-hero__inner">
          <div className="of-hero__icon"><FaTag /></div>
          <h1 className="of-hero__title">🌞 Summer Sale 2026 — June, July & August</h1>
          <p className="of-hero__sub">Cool savings on top HVAC units — beat the heat and the price.</p>
          <div className="of-timer">
            <FaClock className="of-timer__clock" />
            <span className="of-timer__label">Ends in</span>
            <span className="of-timer__seg">{pad(h)}<em>h</em></span>
            <span className="of-timer__sep">:</span>
            <span className="of-timer__seg">{pad(m)}<em>m</em></span>
            <span className="of-timer__sep">:</span>
            <span className="of-timer__seg of-timer__seg--s">{pad(s)}<em>s</em></span>
          </div>
        </div>
      </div>

      <div className="of-inner">
        {loading ? (
          <div className="of-spinner-wrap">
            <div className="of-spinner" />
          </div>
        ) : (
          <div className="of-grid">
            {offers.map((offer, index) => (
              <div
                className={`of-card${visible[index] ? " of-card--visible" : ""}${offer.hot ? " of-card--hot" : ""}`}
                key={index}
                ref={(el) => (cardRefs.current[index] = el)}
                data-idx={index}
              >
                <div className="of-badge">{offer.discount}</div>
                {offer.label && <div className="of-label">{offer.label}</div>}
                <div className="of-card__img-wrap">
                  <img
                    className="of-card__img"
                    src={offer.imageSrc}
                    alt={offer.title}
                  />
                </div>
                <div className="of-card__body">
                  <h2 className="of-card__title">{offer.title}</h2>
                  <p className="of-card__desc">{offer.description}</p>
                  <Link className="of-card__btn" to={offer.linkTo}>
                    {offer.linkText}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
