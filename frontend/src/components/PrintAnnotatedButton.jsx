import { Button } from "react-bootstrap";
import "./PrintAnnotatedButton.css";

const PrintAnnotatedButton = ({ pdfId, isPaid, token }) => {
  const handlePrint = async () => {
    try {
      // Ensure isPaid is boolean
      const paid = isPaid === true || isPaid === "true";

      console.log(
        "handlePrint checking isPaid:",
        isPaid,
        typeof isPaid,
        "->",
        paid
      );

      if (!paid) {
        alert("Printing is available only for paid documents.");
        return;
      }

      const response = await fetch(`/api/print-annotated-pdf/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch PDF for printing");
      }

      const blob = await response.blob();
      const pdfUrl = window.URL.createObjectURL(blob);

      const printWindow = window.open(pdfUrl);
      if (printWindow) printWindow.focus();
    } catch (error) {
      console.error("Error printing PDF:", error);
      alert("Error printing PDF. Please try again.");
    }
  };

  return (
    <Button
      variant="danger"
      className="p-1 print-annotated-button"
      onClick={handlePrint}
    >
      <i className="fas fa-print"></i> Print
    </Button>
  );
};

export default PrintAnnotatedButton;
