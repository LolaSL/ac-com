import React, { useState, useEffect, useRef } from "react";
import "./PremiumCarousel.css";

export default function PremiumCarousel({ banners, onSlideClick }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayRef = useRef(null);

  const totalSlides = banners.length;

  // Auto-play functionality
  useEffect(() => {
    if (isPaused) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(autoPlayRef.current);
  }, [isPaused, totalSlides]);

  // Keyboard navigation
  useEffect(() => {
    const goToNextSlide = () => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    };

    const goToPrevSlide = () => {
      setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    };

    const handleKeyPress = (e) => {
      if (e.key === "ArrowLeft") goToPrevSlide();
      if (e.key === "ArrowRight") goToNextSlide();
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [totalSlides]);

  // Preload next and previous images
  useEffect(() => {
    const preloadImage = (src) => {
      const img = new Image();
      img.src = src;
    };

    const nextIndex = (currentSlide + 1) % totalSlides;
    const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;

    preloadImage(banners[nextIndex].imageSrc);
    preloadImage(banners[prevIndex].imageSrc);
  }, [currentSlide, banners, totalSlides]);

  const goToSlide = (index) => {
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const goToNext = () => {
    goToSlide((currentSlide + 1) % totalSlides);
  };

  const goToPrevious = () => {
    goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  return (
    <div
      className="premium-carousel-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Carousel Container */}
      <div className="premium-carousel-container">
        {/* Slide Wrapper */}
        <div className="premium-slides-wrapper">
          {banners.map((banner, index) => (
            <div
              key={index}
              className={`premium-slide ${
                index === currentSlide ? "active" : ""
              } ${isTransitioning ? "transitioning" : ""}`}
              style={{
                backgroundImage: `url(${banner.imageSrc})`,
              }}
            >
              {/* Overlay Gradient */}
              <div className="slide-overlay"></div>

              {/* Content */}
              <div className="slide-content">
                <h1 className="slide-title">{banner.title}</h1>
                {banner.description && (
                  <p className="slide-description">{banner.description}</p>
                )}
                <button
                  className="slide-cta-btn"
                  onClick={() => onSlideClick(index)}
                >
                  {banner.linkText}
                  <span className="btn-arrow">→</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          className="carousel-nav-btn prev"
          onClick={goToPrevious}
          aria-label="Previous slide"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <button
          className="carousel-nav-btn next"
          onClick={goToNext}
          aria-label="Next slide"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        {/* Slide Counter */}
        <div className="slide-counter">
          {currentSlide + 1} / {totalSlides}
        </div>

        {/* Custom Indicators with Titles */}
        <div className="custom-indicators">
          {banners.map((banner, index) => (
            <button
              key={index}
              className={`indicator-btn ${
                index === currentSlide ? "active" : ""
              }`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            >
              <span className="indicator-dot"></span>
              <span className="indicator-title">{banner.title}</span>
            </button>
          ))}
        </div>

        {/* Pause Indicator */}
        {isPaused && (
          <div className="pause-indicator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            Paused
          </div>
        )}
      </div>
    </div>
  );
}
