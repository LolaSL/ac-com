import { useState } from "react";
import { Button } from "react-bootstrap";
import { Modal } from "react-bootstrap";
import { Carousel } from "react-bootstrap";

const ArchSymbolsModal = () => {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const [index, setIndex] = useState(0);

  const images = [
    "/images/arch-sym1.jpg",
    "/images/arch-sym2.jpg",
    "/images/arch-sym3.jpg",
    "/images/arch-sym4.jpg",
  ];

  const handleSelect = (selectedIndex) => {
    setIndex(selectedIndex);
  };

  return (
    <>
      <Button
        variant="btn-outline w-auto"
        size="sm"
        className=" text-center go-to-btn btn-text"
        onClick={handleShow}
      >
        View Arch Symbols
      </Button>
      <Modal
        show={show}
        onHide={handleClose}
        dialogClassName="modal-lg"
        className="custom-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold  text-capitalize ">
            Important architectural symbols
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Carousel
            activeIndex={index}
            onSelect={handleSelect}
            className="w-100"
            interval={3000}
            slide={true}
          >
            {images.map((image, i) => (
              <Carousel.Item key={i}>
                <div
                  className="w-100 d-flex justify-content-center align-items-center"
                  style={{
                    maxHeight: "500px",
                    height: "60vh",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={image}
                    alt={`Slide ${i + 1}`}
                    style={{
                      width: "auto",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    className="rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              </Carousel.Item>
            ))}
          </Carousel>
        </Modal.Body>
        <Modal.Footer>
          <Button
             className="go-to-btn btn-text w-auto"
            variant="btn-outline"
            size="sm"
            onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ArchSymbolsModal;
