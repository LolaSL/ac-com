import { useState, useEffect } from "react";
import { FaPlayCircle, FaTimes, FaVideo } from "react-icons/fa";
import "./PdfHelpVideo.css";
import { VIDEO_LIBRARY } from "../data/videoLibrary";

const PdfHelpVideoModal = () => {
  const [show, setShow] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(VIDEO_LIBRARY[0]);
  const [playing, setPlaying] = useState(false);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [show]);

  const handleClose = () => { 
    setShow(false); 
    setPlaying(false); 
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setPlaying(false); // Reset playing state when switching videos
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
                      <img src={video.thumbnail} alt={video.title} />
                      {selectedVideo.id === video.id && (
                        <div className="phv-video-card__playing-badge">
                          <FaPlayCircle /> Now Playing
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

              {/* Selected Video Player */}
              <div className="phv-player-section">
                <h3 className="phv-player-title">
                  <FaPlayCircle className="phv-player-title__icon" />
                  {selectedVideo.title}
                </h3>
                <p className="phv-player-description">{selectedVideo.description}</p>
                
                <div className="phv-video-wrap">
                  {playing ? (
                    <iframe
                      src={`${selectedVideo.embedUrl}&autoplay=1`}
                      title={selectedVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="phv-iframe"
                    />
                  ) : (
                    <button 
                      className="phv-thumb-btn" 
                      onClick={() => setPlaying(true)} 
                      aria-label={`Play ${selectedVideo.title}`}
                    >
                      <img 
                        src={selectedVideo.thumbnail} 
                        alt={`${selectedVideo.title} thumbnail`} 
                        className="phv-thumb" 
                      />
                      <span className="phv-play-icon" aria-hidden="true">▶</span>
                    </button>
                  )}
                </div>

                {!playing && (
                  <p className="phv-video-cta">
                    <a href={selectedVideo.watchUrl} target="_blank" rel="noopener noreferrer">
                      Watch on YouTube
                    </a>
                  </p>
                )}
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
