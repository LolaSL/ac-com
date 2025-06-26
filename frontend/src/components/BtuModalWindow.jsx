import { useState } from "react";
import { Modal, Button } from "react-bootstrap";

const BtuModalWindow = () => {
  const [show, setShow] = useState(false);
  const handleShow = () => {
    setShow(true);
    setTimeout(() => {
      setShow(false);
    }, 15000);
  };

  return (
    <>
      <Button
        className="go-to-btn btn-text"
        variant="btn-outline"
        onClick={handleShow}
      >
        How BTU Calculation Works
      </Button>
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger text-bold">
            How BTU Calculation Works
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-gray-700 mb-4 fs-5">
            BTU (British Thermal Unit) is a measure of heat. This calculator
            provides an estimation based on common factors:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
            <li className="fs-5 ">
              <strong>Base Calculation:</strong> 600 BTU/m2 used as a base rule.
            </li>
            <li className="fs-5 ">
              <strong>Outdoor Unit (Condenser) Location:</strong>
              Desired location of outdoor unit.
            </li>
            <li className=" fs-5 ">
              <strong>Number of people:</strong> Each person adds a fixed BTU
              amount (e.g., 600 BTU).
            </li>
            <li className=" fs-5 ">
              <strong>Type of wall:</strong> Real wall type.
            </li>
            <li className=" fs-5 ">
              <strong>Insulation:</strong> Poor insulation increases BTU needs.
            </li>
            <li className=" fs-5 ">
              <strong>Sun Exposure:</strong> Each window adds ~1000 BTU.
            </li>
            <li className="fs-5 ">
              <strong>Climate:</strong> BTU needs vary by temperature zone.
            </li>
          </ul>
          <p className=" fs-5 ">
            <strong className="text-red-600">Important:</strong> This is an
            estimate. Consult an HVAC expert for precise needs.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="go-to-btn btn-text"
            variant="btn-outline"
            onClick={() => setShow(false)}
          >
            Close Now
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default BtuModalWindow;
