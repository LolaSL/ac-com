import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'react-bootstrap'; // Import Modal
import {  GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
const Sidebar = () => {
  const [savedPdfs, setSavedPdfs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchSavedPdfs = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo?.token;

        if (!token) {
          console.warn('User not authenticated, skipping fetch.');
          return;
        }

        const response = await fetch('/api/user-annotations', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSavedPdfs(data);
        } else {
          console.error('Failed to fetch saved PDFs:', response.status);
        }
      } catch (error) {
        console.error('Error fetching saved PDFs:', error);
      }
    };
    fetchSavedPdfs();
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const viewPdfWithAnnotations = async (pdfId, filename) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;

      if (!token) {
        console.error('Authentication token not found.');
        return;
      }

      // Fetch the PDF data
      const pdfResponse = await fetch(`/api/annotated-pdf/${pdfId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!pdfResponse.ok) {
        console.error(`Failed to fetch PDF with ID ${pdfId}:`, pdfResponse.status);
        return;
      }
      const pdfBlob = await pdfResponse.blob();
      const pdfUrl = window.URL.createObjectURL(pdfBlob);

      // Fetch the annotations for the PDF
      const annotationsResponse = await fetch(`/api/annotations/${pdfId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!annotationsResponse.ok) {
        console.error(`Failed to fetch annotations for PDF ID ${pdfId}:`, annotationsResponse.status);
        window.URL.revokeObjectURL(pdfUrl); // Clean up the PDF URL
        return;
      }
      const annotationsData = await annotationsResponse.json();

      // Render the PDF with annotations
      renderPdfWithAnnotations(pdfUrl, annotationsData);

      // Optionally, you might want to open the rendered PDF in a new tab or display it in a specific container
    } catch (error) {
      console.error(`Error viewing PDF with annotations for ID ${pdfId}:`, error);
    }
  };

  // Function to render the PDF using PDF.js and overlay annotations
  const renderPdfWithAnnotations = (pdfUrl, annotations) => {
    const container = document.getElementById('pdf-container');
    container.innerHTML = ''; // Clear previous render
  
    const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise.then((pdf) => {
      pdf.getPage(1).then((page) => {
        const scale = 1.5; // Or whatever zoom level you want
        const viewport = page.getViewport({ scale });
       // Create canvas for PDF page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
  
        container.appendChild(canvas);
  
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
  
        page.render(renderContext).promise.then(() => {
          // Create overlay canvas
          const overlayCanvas = document.createElement('canvas');
          overlayCanvas.width = viewport.width;
          overlayCanvas.height = viewport.height;
          overlayCanvas.style.position = 'absolute';
          overlayCanvas.style.top = '0';
          overlayCanvas.style.left = '0';
          overlayCanvas.style.pointerEvents = 'none';
  
          container.style.position = 'relative';
          container.appendChild(overlayCanvas);
  
          const overlayContext = overlayCanvas.getContext('2d');
          overlayAnnotations(overlayContext, annotations);
        });
      });
    });
  };
  
  
  // Function to overlay annotations (rectangles, lines, comments) on the PDF canvas
  const overlayAnnotations = (context, annotations) => {
    if (annotations && annotations.rectangles) {
        annotations.rectangles.forEach((rect) => {
          
        context.beginPath();
        context.rect(rect.x, rect.y, rect.width, rect.height);
        context.lineWidth = 2;
        context.strokeStyle = 'rgba(0, 0, 255, 0.5)';
        context.stroke();
      });
    }

    if (annotations && annotations.lines) {
      annotations.lines.forEach((line) => {
        context.beginPath();
        context.moveTo(line.points[0], line.points[1]);
        for (let i = 2; i < line.points.length; i += 2) {
          context.lineTo(line.points[i], line.points[i + 1]);
        }
        context.lineWidth = line.strokeWidth || 2;
        context.strokeStyle = line.stroke || 'black';
        context.stroke();
      });
    }

    if (annotations && annotations.comments) {
      annotations.comments.forEach((comment) => {
        context.fillStyle = comment.fill || 'blue';
        context.font = '14px Arial';
        context.fillText(comment.text, comment.x, comment.y);
      });
      }
 
      
  };

  return (
    <>
      <Button className="sidebar-toggle" onClick={toggleSidebar}>
        {isOpen ? 'Close Saved PDFs' : 'Open Saved PDFs'}
      </Button>

      <Modal Modal show={isOpen} onHide={toggleSidebar} dialogClassName="custom-modal-width"> {/* Use the Modal component */}
        <Modal.Header closeButton>
          <Modal.Title>Saved Documents</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div id="pdf-container" 
    style={{
      width: '100%',
      height: '80vh',
      border: '1px solid #ccc',
      overflow: 'auto',
      marginTop: '1rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'left',
    }}>
            {/* PDF will be rendered here */}
            {savedPdfs.length > 0 && (
              <ul>
                {savedPdfs.map((pdf) => (
                  <li key={pdf._id}>
                    <Button onClick={() => viewPdfWithAnnotations(pdf._id, pdf.filename)}>
                      View {pdf.filename || 'Untitled Document'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {savedPdfs.length === 0 && <p>No saved documents yet.</p>}
          </div>
          {/* <div
    id="pdf-container"
    style={{ width: '100%', height: '500px', border: '1px solid #ccc', marginTop: '1rem' }}
  >
    {/* PDF will render here */}
  {/* </div> */} 
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={toggleSidebar}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Sidebar;