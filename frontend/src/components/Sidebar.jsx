import React, { useState, useEffect } from 'react';


const Sidebar = () => {
  const [savedPdfs, setSavedPdfs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Function to fetch the list of saved PDFs from your backend
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

  const downloadPdf = async (pdfId, filename) => {
    try {
      const response = await fetch(`/api/annotated-pdf/${pdfId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'downloaded-document.pdf'; // Use filename if available
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error(`Failed to download PDF with ID ${pdfId}:`, response.status);
        // Optionally, display an error message to the user
      }
    } catch (error) {
      console.error(`Error downloading PDF with ID ${pdfId}:`, error);
      // Optionally, display an error message to the user
    }
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isOpen ? 'Close' : 'Open'} Saved PDFs
      </button>
      <div className="sidebar-content">
        <h2>Saved Documents</h2>
        {savedPdfs.length > 0 ? (
          <ul>
            {savedPdfs.map((pdf) => (
              <li key={pdf._id}>
                <button onClick={() => downloadPdf(pdf._id, pdf.filename)}>
                  {pdf.filename || 'Untitled Document'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No saved documents yet.</p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;