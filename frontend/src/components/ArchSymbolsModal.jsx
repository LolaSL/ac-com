import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { Modal } from 'react-bootstrap';
import { Carousel } from 'react-bootstrap';


const ArchSymbolsModal = () => {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);
    const [index, setIndex] = useState(0);

    const images = [
        "/images/arch-sym1.jpg",
        "/images/arch-sym2.jpg",
        "/images/arch-sym3.jpg",
        "/images/arch-sym4.jpg"
    ];

    const handleSelect = (selectedIndex) => {
        setIndex(selectedIndex);
    };

    return (
        <>
            <Button variant="outline-secondary" onClick={handleShow}>
                View Architectural Symbols
            </Button>
            <Modal show={show} onHide={handleClose} dialogClassName="modal-lg" className="custom-modal">
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold  text-capitalize '>Important architectural symbols</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Carousel activeIndex={index} onSelect={handleSelect} className="w-100">
                        {images.map((image, i) => (
                            <Carousel.Item key={i}>
                                <div className="w-100 d-flex justify-content-center">
                                    <img
                                        className="d-block w-100 h-auto rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                                        src={image}
                                        alt={`Slide ${i + 1}`}
                                    />
                                </div>
                            </Carousel.Item>
                        ))}
                    </Carousel>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ArchSymbolsModal;
