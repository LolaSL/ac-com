import React from "react";
import { FaBan } from "react-icons/fa";
import "./CancellationPage.css";

const CancellationPage = () => {
  return (
    <div className="cnc-page">
      <div className="cnc-hero">
        <div className="cnc-hero__inner">
          <div className="cnc-hero__icon"><FaBan /></div>
          <h1 className="cnc-hero__title">Cancellation Policy</h1>
          <p className="cnc-hero__sub">We process orders quickly — here's what you need to know about cancellations.</p>
        </div>
      </div>
      <div className="cnc-inner">

      <p className="fs-5">
        At AC-Commerce Home Supply, we understand that sometimes plans change. Any
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
      </div>
    </div>
  );
};

export default CancellationPage;
