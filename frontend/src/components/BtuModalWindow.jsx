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
        className="go-to-btn btn-text w-auto"
              size="sm"
        variant="btn-outline"
        onClick={handleShow}
      >
       BTU Calculator Tutorial
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
            <li className="fs-5">
              <strong>Base Calculation:</strong> 600 BTU/m² used as a base rule.
            </li>
            <li className="fs-5">
              <strong>Outdoor Unit (Condenser) Location:</strong>
              Desired location of outdoor unit.
            </li>
            <li className="fs-5">
              <strong>Number of People:</strong> Each person adds ~600 BTU.
            </li>
            <li className="fs-5">
              <strong>Wall Type:</strong> Materials and thickness affect BTU.
            </li>
            <li className="fs-5">
              <strong>Insulation Quality:</strong> Poor insulation increases BTU needs.
            </li>
            <li className="fs-5">
              <strong>Sun Exposure:</strong> More windows or south/west-facing rooms need more cooling.
            </li>
            <li className="fs-5">
              <strong>Window Type:</strong> Single-glazed windows allow more heat than triple-glazed.
            </li>
            <li className="fs-5">
              <strong>Apartment Orientation:</strong> South and west orientations receive more sunlight.
            </li>
            <li className="fs-5">
              <strong>Floor Type:</strong> Materials like marble or tile can retain or reflect heat differently.
            </li>
            <li className="fs-5">
              <strong>Roof Type:</strong> Flat roofs may increase heat load compared to pitched or insulated ones.
            </li>
            <li className="fs-5">
              <strong>Appliances:</strong> Kitchen and electronic devices contribute additional heat load.
            </li>
            <li className="fs-5">
              <strong>Climate Zone:</strong> BTU needs vary by temperature and humidity region.
            </li>
          </ul>
          <p className="fs-5">
            <strong className="text-red-600">Important:</strong> This is a
            general estimate. Consult a licensed HVAC expert for precise system sizing.
          </p>
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

export default BtuModalWindow;
