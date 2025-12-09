import React from "react";
import { Container } from "react-bootstrap";

const ShipMentPage = () => {
  return (
<Container className="my-5">
  <h2 className="mb-4">Shipping & Delivery</h2>

  <p className="fs-5">
    We’ve made shipping simple for all our air conditioners, outdoor units, and ventilation equipment. For orders within the Contiguous United States, shipping is calculated based on your order value:
  </p>

  <ul className="fs-5">
    <li>Orders over $5,000: $100 shipping</li>
    <li>Orders over $2,000: $50 shipping</li>
    <li>Orders over $500: $25 shipping</li>
    <li>Orders under $500: $10 shipping</li>
  </ul>

  <p className="fs-5">
    Prices displayed at checkout include shipping. All items are subject to tax. For shipments to Alaska, Hawaii, Puerto Rico, or areas requiring special arrangements (like ferry or air freight), please contact us for a shipping quote. Currently, we do not ship outside the USA.
  </p>

  <p className="fs-5">
    Each item includes an estimated processing time before leaving our warehouse, which covers preparation and shipment. Once shipped, delivery generally takes 1–10 business days depending on your location and the warehouse the item ships from. On rare occasions, delivery may take up to 20 days.
  </p>

  <h4>Small Items (Under 100 lbs.)</h4>
  <p className="fs-5">
    Most smaller HVAC parts, accessories, and components ship via FedEx, UPS, or USPS. Deliveries are typically curbside. Liftgate service may be included for heavier residential shipments. All shipments are FOB (Free on Board) Origin/Shipping Point.
  </p>

  <h4>Large Items & Freight Shipments</h4>
  <p className="fs-5">
    Most large HVAC units, outdoor condensers, and ventilation equipment ship via LTL (Less-Than-Truckload) freight carriers such as TForce, Estes, R&L Carriers, Ward Trucking, or Daylight Transport. All freight shipments are FOB Origin, and ownership transfers to the customer upon shipment. Insurance is available at the buyer’s request before the order.
  </p>

  <p className="fs-5">
    Freight shipments generally require a signature and appointment for residential delivery. Liftgate service is included for items over 150 lbs. Deliveries are curbside by default; for in-home delivery or special arrangements, please contact us before ordering. Commercial deliveries occur during normal business hours without liftgate service unless requested in order notes.
  </p>

  <h4>Delivery & Inspection</h4>
  <p className="fs-5">
    You will receive tracking information and carrier contact details via email once your order ships. On delivery day, ensure an adult is present to receive and inspect the item. Check all sides, including the bottom, for any damage. Note any issues on the delivery receipt. If an item is damaged beyond repair, refuse delivery and take photos. Report damage within 5 business days.
  </p>

  <h4>Returns & Fees</h4>
  <p className="fs-5">
    Shipping fees for authorized returns are the customer’s responsibility. Refused shipments or cancellations after an order is loaded will incur freight charges plus a 25% restocking fee. Special orders cannot be canceled.
  </p>

  <h4>Installation & Support</h4>
  <p className="fs-5">
    Once delivered, installation should be performed by a qualified installer. Visit our blog for tips and guidance. If you encounter any issues, our support team is available to help. Share pictures of completed installations with us – we love to see our products in action!
  </p>

  <h4>Special Notes</h4>
  <p className="fs-5">
    Alternate shipping addresses must be listed with your credit card company for verification. Standard delivery is curbside; white glove delivery is available with prior arrangements. Once an order is shipped, it cannot be canceled.
  </p>
</Container>

  );
};

export default ShipMentPage;
