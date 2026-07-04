import { useState, useEffect } from "react";
import { FaPlayCircle, FaTimes, FaVideo } from "react-icons/fa";
import "./PdfHelpVideo.css";
import { VIDEO_LIBRARY } from "../data/videoLibrary";

const PdfHelpVideoModal = () => {
  const [show, setShow] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(VIDEO_LIBRARY[0]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [show]);

  const handleClose = () => {
    setShow(false);
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
  };

  // Prefer higher-quality thumbnail (sddefault) with cascading fallback
  const getThumbUrl = (video) =>
    `https://img.youtube.com/vi/${video.videoId}/sddefault.jpg`;

  const handleThumbError = (e, videoId) => {
    // Cascading fallback: sddefault → hqdefault → mqdefault → default → gradient
    const src = e.target.src;
    if (src.includes('sddefault')) {
      e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    } else if (src.includes('hqdefault')) {
      e.target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    } else if (src.includes('mqdefault')) {
      e.target.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
    } else {
      e.target.style.display = 'none';
      if (e.target.parentElement) {
        e.target.parentElement.style.background =
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      }
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button className="phv-trigger" onClick={() => setShow(true)}>
        <FaPlayCircle className="phv-trigger__icon" />
        Video Tutorials ({VIDEO_LIBRARY.length})
      </button>

      {/* Modal overlay */}
      {show && (
        <div className="phv-overlay" onClick={handleClose}>
          <div className="phv-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="phv-header">
              <div className="phv-header__left">
                <FaVideo className="phv-header__icon" />
                <h2 className="phv-header__title">Video Tutorial Library</h2>
              </div>
              <button className="phv-close" onClick={handleClose} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="phv-body">
              {/* Video Selector Grid */}
              <div className="phv-video-grid">
                {VIDEO_LIBRARY.map((video) => (
                  <button
                    key={video.id}
                    className={`phv-video-card ${selectedVideo.id === video.id ? 'phv-video-card--active' : ''}`}
                    onClick={() => handleVideoSelect(video)}
                  >
                    <div className="phv-video-card__thumb">
                      <img
                        src={getThumbUrl(video)}
                        alt={video.title}
                        onError={(e) => handleThumbError(e, video.videoId)}
                      />
                      {selectedVideo.id === video.id && (
                        <div className="phv-video-card__playing-badge">
                          <FaPlayCircle /> Selected
                        </div>
                      )}
                    </div>
                    <div className="phv-video-card__content">
                      <span className="phv-video-card__category">{video.category}</span>
                      <h3 className="phv-video-card__title">{video.title}</h3>
                      <p className="phv-video-card__duration">{video.duration}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Video Player — thumbnail link (opens YouTube in new tab) */}
              <div className="phv-player-section">
                <h3 className="phv-player-title">
                  <FaPlayCircle className="phv-player-title__icon" />
                  {selectedVideo.title}
                </h3>
                <p className="phv-player-description">{selectedVideo.description}</p>

                <div className="phv-video-wrap">
                  <a
                    href={selectedVideo.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="phv-thumb-btn"
                    aria-label={`Watch ${selectedVideo.title} on YouTube`}
                  >
                    <img
                      src={getThumbUrl(selectedVideo)}
                      alt={`${selectedVideo.title} thumbnail`}
                      className="phv-thumb"
                      onError={(e) => handleThumbError(e, selectedVideo.videoId)}
                    />
                    <span className="phv-play-icon" aria-hidden="true">▶</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="phv-footer">
              <button className="phv-close-btn" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PdfHelpVideoModal;
