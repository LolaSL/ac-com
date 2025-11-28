import { useState } from "react";
import { Modal, Button } from "react-bootstrap";

const ModalLegend = () => {
  const [show, setShow] = useState(false);
  const handleShow = () => {
    setShow(true);
    setTimeout(() => {
      setShow(false);
    }, 45000);
  };

  return (
    <>
      <Button
        className="go-to-btn btn-text w-auto"
        size="sm"
        variant="btn-outline"
        onClick={handleShow}
      >
        Legend / Instructions
      </Button>
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger text-bold">
            Legend / Instructions
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="list-disc ml-4 space-y-1 fs-6">
            <li>Supported: High-resolution PDF files (.pdf).</li>
            <li>
              PDFs should be flat/apartment drawings and without modifications.
            </li>
            <li>
              Recommended: Place the air conditioner (rectangle) above the door
              in the drawing.
            </li>
            <li>
              <strong>➕ Add Rectangle:</strong> Click on an empty area.
            </li>
            <li>
              <strong>💬 Add Comment:</strong> Enter text in the prompt (e.g.,
              ac1, ac2...)
            </li>
            <li>
              <strong>🔄 Rotate Rectangle:</strong> Click on the rectangle.
            </li>
            <li>
              <strong>🗑️ Delete (small screens):</strong> Tap and hold.
            </li>
            <li>
              <strong>🗑️ Delete (large screens):</strong> Right-click.
            </li>
            <li>
              <strong>📌 Move Rectangle with mouse (large screens )</strong>
            </li>
            <li>
              <strong>📌 Move Rectangle with thouch (small screens)</strong>
            </li>
            <li>
              <strong>📌 Move Drawing (keyboard):</strong>
              <div className="ml-4 mt-1">
                <span>← Move Left &nbsp;&nbsp; → Move Right</span>
                <br />
                <span>↑ Move Up &nbsp;&nbsp; ↓ Move Down</span>
              </div>
            </li>
            <li>
              <strong>💾 Save Approved Drawing:</strong> Click the “Save PDF
              File” button.
            </li>
            <li>
              <strong>🧹 Clear Drawing:</strong> Click the “Clear” button to
              remove all shapes.
            </li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="go-to-btn btn-text w-auto"
            variant="btn-outline"
            size="sm"
            onClick={() => setShow(false)}
          >
            Close Now
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalLegend;
