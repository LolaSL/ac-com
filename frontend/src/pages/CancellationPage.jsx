import React from "react";
import { Container } from "react-bootstrap";
import "./CancellationPage.css";

const CancellationPage = () => {
  return (
    <Container className="my-5">
      <h1 className="page-title mb-4">Cancellation Policy</h1>

      <p className="fs-5">
        At AC Com Home Supply, we understand that sometimes plans change. Any
        order that has{" "}
        <strong>not yet been loaded onto a truck or shipped</strong> can be
        cancelled. Please contact us immediately if you need to cancel, as we
        process and ship orders quickly to ensure timely delivery of air
        conditioners, outdoor units, and ventilation equipment.
      </p>

      <p className="fs-5">
        Once an item has been shipped or loaded onto a truck, the order{" "}
        <strong>cannot be cancelled</strong>. In this case, the order will
        follow our <a href="/returns">Return Policy</a>. Refused shipments will
        be subject to a <strong>25% restocking fee</strong> plus all
        shipping/freight charges incurred.
      </p>

      <p className="fs-5">
        Cancellation requests can <strong>only</strong> be accepted via email.
        Please send your request to:{" "}
        <a href="mailto:support@accomhomesupply.com">
          support@accomhomesupply.com
        </a>
      </p>

      <p className="fs-5">
        We encourage you to double-check your order details before placing an
        order to avoid delays or additional fees.
      </p>
    </Container>
  );
};

export default CancellationPage;
