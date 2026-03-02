import { useState, useEffect } from "react";
import { FaPlayCircle, FaTimes } from "react-icons/fa";
import "./PdfHelpVideo.css";

const PdfHelpVideoModal = () => {
  const [show, setShow] = useState(false);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [show]);

  return (
    <>
      {/* Trigger button */}
      <button className="phv-trigger" onClick={() => setShow(true)}>
        <FaPlayCircle className="phv-trigger__icon" />
        Learn with Video
      </button>

      {/* Modal overlay */}
      {show && (
        <div className="phv-overlay" onClick={() => setShow(false)}>
          <div className="phv-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="phv-header">
              <div className="phv-header__left">
                <FaPlayCircle className="phv-header__icon" />
                <h2 className="phv-header__title">PDF Annotation Tutorial</h2>
              </div>
              <button className="phv-close" onClick={() => setShow(false)} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="phv-body">
              <p className="phv-subtitle">
                Watch this short tutorial to learn how to annotate, edit, and download your PDF file.
              </p>
              <div className="phv-video-wrap">
                <iframe
                  src="https://www.youtube.com/embed/-s4pdK35YZk"
                  title="PDF Annotation Instruction Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Footer */}
            <div className="phv-footer">
              <button className="phv-close-btn" onClick={() => setShow(false)}>
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
