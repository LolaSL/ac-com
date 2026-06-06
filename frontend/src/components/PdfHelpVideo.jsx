import { useState, useEffect } from "react";
import { FaPlayCircle, FaTimes } from "react-icons/fa";
import "./PdfHelpVideo.css";

const VIDEO_ID = "-s4pdK35YZk";
const THUMB_URL = `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`;
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
const EMBED_URL = `https://www.youtube.com/embed/${VIDEO_ID}`;

const PdfHelpVideoModal = () => {
  const [show, setShow] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [show]);

  const handleClose = () => { setShow(false); setPlaying(false); };

  return (
    <>
      {/* Trigger button */}
      <button className="phv-trigger" onClick={() => setShow(true)}>
        <FaPlayCircle className="phv-trigger__icon" />
        Learn with Video
      </button>

      {/* Modal overlay */}
      {show && (
        <div className="phv-overlay" onClick={handleClose}>
          <div className="phv-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="phv-header">
              <div className="phv-header__left">
                <FaPlayCircle className="phv-header__icon" />
                <h2 className="phv-header__title">PDF Annotation Tutorial</h2>
              </div>
              <button className="phv-close" onClick={handleClose} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="phv-body">
              <p className="phv-subtitle">
                Watch this short tutorial to learn how to annotate, edit, and download your PDF file.
              </p>
              <div className="phv-video-wrap">
                {playing ? (
                  <iframe
                    src={`${EMBED_URL}?autoplay=1`}
                    title="PDF Annotation Instruction Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button className="phv-thumb-btn" onClick={() => setPlaying(true)} aria-label="Play video">
                    <img src={THUMB_URL} alt="PDF Annotation Tutorial thumbnail" className="phv-thumb" />
                    <span className="phv-play-icon" aria-hidden="true">▶</span>
                  </button>
                )}
              </div>
              {!playing && (
                <p className="phv-video-cta">
                  Can't play?{" "}
                  <a href={WATCH_URL} target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="phv-footer">
              <button className="phv-close-btn" onClick={handleClose}>
                Close Video
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default PdfHelpVideoModal;
