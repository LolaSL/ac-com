import { useState } from "react";
import { Modal, Button } from "react-bootstrap";

const PdfHelpVideoModal = () => {
  const [show, setShow] = useState(false);

  const handleShow = () => setShow(true);
  const handleClose = () => setShow(false);

  return (
    <>
      <Button
        className="go-to-btn btn-text"
        variant="btn-outline"
        onClick={handleShow}
      >
        Watch Tutorial
      </Button>

      <Modal show={show} onHide={handleClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-primary text-bold">
            PDF Annotation Tutorial
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-secondary text-bold fs-5">
            Watch this short tutorial to learn how to annotate, edit, and download your PDF file.
          </p>
          <div className="ratio ratio-16x9">
            <iframe
              width="560"
              height="315"
              src="https://www.youtube.com/embed/-s4pdK35YZk"
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="go-to-btn btn-text"
            variant="btn-outline"
            onClick={handleClose}
          >
            Close Video
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PdfHelpVideoModal;

