import { useEffect, useState, useCallback, useRef } from "react";

const SquarePaymentForm = ({ order }) => {
  const amountToPay = order?.totalPrice
    ? Math.round(order.totalPrice * 100)
    : 1000;

  const [card, setCard] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const cardAttachedRef = useRef(false); 

  const SQUARE_ENV =
    process.env.NODE_ENV === "production" ? "production" : "sandbox";
  const SQUARE_APP_ID = process.env.REACT_APP_SQUARE_APP_ID;

  const initializeSquare = useCallback(async () => {
    if (!SQUARE_APP_ID || !window.Square) return;

    try {
      const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_ENV);

      if (cardAttachedRef.current) return; 

      const cardInstance = await payments.card();
      const container = document.getElementById("card-container");

      if (container) {
        container.innerHTML = ""; 
        await cardInstance.attach("#card-container"); 
        cardAttachedRef.current = true; 
        setCard(cardInstance);
        setError(null);
      }
    } catch (err) {
      console.error("Square init error:", err);
      setError("Error initializing payment form.");
    }
  }, [SQUARE_APP_ID, SQUARE_ENV]);

  useEffect(() => {
    initializeSquare();
  }, [initializeSquare]);

  const handlePayClick = async () => {
    if (!card || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await card.tokenize();

      if (result.status === "OK") {
        const response = await fetch("http://localhost:5020/api/orders/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nonce: result.token, orderId: order._id }),
        });

        const data = await response.json();
        console.log("Response status:", response.status);
        if (!order?._id) {
          alert("Missing order ID for payment.");
          return;
        }

        if (response.ok) {
          alert("Payment successful!");
        } else {
          throw new Error(data.message || "Payment failed.");
        }
      } else {
        throw new Error(result.errors?.[0]?.message || "Tokenization failed.");
      }
      console.log("Sending payment request to backend:", {
        nonce: result.token,
        amount: amountToPay,
      });
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="square-payment-wrapper">
      <div id="card-container" className="card-container" />

      {error && <div className="error-message">Error: {error}</div>}

      <button
        onClick={handlePayClick}
        disabled={!card || isProcessing}
        className="pay-button"
      >
        {isProcessing
          ? "Processing..."
          : `Credit Card - Pay With Square $${(amountToPay / 100).toFixed(2)}`}
      </button>
    </div>
  );
};

export default SquarePaymentForm;
