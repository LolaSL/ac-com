import React from "react";
import Image from "react-bootstrap/Image";
import { Link } from "react-router-dom";
import { FaSnowflake } from "react-icons/fa";
import "./AdvancedAC.css";

const AdvancedAC = () => {
  return (
    <div className="advanced-ac-page">
      {/* Hero Banner */}
      <section className="aac-hero">
        <div className="aac-hero__inner">
          <FaSnowflake className="aac-hero__icon" />
          <h1 className="aac-hero__title">Advanced Air Conditioning 2026</h1>
          <p className="aac-hero__sub">
            Discover the latest HVAC technologies for comfort, efficiency, and sustainability
          </p>
        </div>
      </section>

      {/* Content Wrapper */}
      <div className="aac-content">
        <article>
          <p className="mb-3 p-3 ac-conditioning fs-5">
            As we step into 2026, the HVAC industry is buzzing with advancements
            that promise to make homes more comfortable, energy-efficient, and
            environmentally friendly. From cutting-edge technology to
            eco-conscious solutions, the future of HVAC is here. If you've been
            considering upgrading your system, now is the perfect time to explore
            what's new.
          </p>
        <h3 className="mb-2 p-4 fs-3 text-bold">
          Energy-Efficient Systems: Saving More, Consuming Less
        </h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          Energy efficiency is a leading trend in 2026 HVAC. Modern systems
          utilize innovations like variable-speed compressors and advanced
          sensors to maximize comfort while minimizing energy consumption and
          environmental impact. In 2026, energy efficiency is a key focus in
          HVAC. New systems employ technologies such as variable-speed
          compressors and improved heat exchangers to deliver optimal comfort
          with lower energy use and a smaller carbon footprint. 
          </p>
             <h3 className="mb-2 p-4 fs-3 text-bold">Samsung BESPOKE AI WindFree ACs</h3>
          <p className="mb-3 p-3 ac-conditioning fs-4">The latest collection of air conditioners features  <strong>Samsung’s </strong>WindFree Cooling technology, which disperses air through 23,000 micro holes to eliminate direct drafts. Additionally, the AI Fast & Comfort Cooling function enables quick cooling before transitioning to an energy-efficient mode. The AI Energy Mode is designed to optimize cooling settings, potentially reducing energy consumption by up to 30%.</p>
        
          <div className="mb-4 text-center pb-4">
          <Image
            src="/images/ac.jpg"
            alt="Air Conditioning"
            className="responsive-image-advanced rounded"
          />
        </div>
      </article>
      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">
          Heat Pumps: The All-Weather Solution
        </h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          Heat pumps are becoming a go-to solution for homeowners seeking
          year-round comfort and energy efficiency. With advancements in
          cold-climate heat pump technology, these systems can now effectively
          operate in extreme temperatures, making them a versatile choice for
          any region.
          </p>
        <p className="mb-3 p-3 ac-conditioning fs-4">
        <strong>LG’s </strong>advanced components bring energy-efficient warmth to everyday living designed for comfort and made for reliability.
        </p>
        <div className="mb-4 text-center pb-4">
          <Image
            src="/images/ac2.jpg"
            alt="Air Conditioning"
            className="responsive-image-advanced rounded"
          />
        </div>
      </article>
      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">
          Indoor Air Quality Innovations
        </h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          Improving indoor air quality (IAQ) is a top priority for 2026. HVAC
          systems are now integrating air purifiers, UV-C light technology, and
          high-efficiency particulate air (HEPA) filters to remove allergens,
          bacteria, and viruses from your home’s air. These systems ensure a
          healthier living environment for you and your family.
        </p>
        <div className="mb-4 text-center">
          <Image
            src="/images/ac3.jpg"
            alt="Air Conditioning team"
            className="responsive-image-advanced rounded"
          />
          </div>
          <p className="mb-3 p-3 ac-conditioning fs-4">
          <strong>Daikin’s </strong>new range of Air Purifiers with Streamer Technology are designed to capture, suppress and break down pollutants such as mould, pollen, allergens, odours, formaldehyde, traffic pollution and dust. Perfect for allergy sufferers!
          </p>
        <div className="mb-4 text-center">
          <Image
            src="/images/ac4.jpg"
            alt="Air Conditioning Purifier"
            className="responsive-image-advanced rounded"
          />
        </div>
      </article>
      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">Why Upgrade in 2026?</h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          2026 marks a pivotal year for HVAC upgrades, driven by transformative industry changes. Regulatory mandates now require eco-friendly A2L refrigerants, while new efficiency standards ensure dramatically reduced energy consumption. Modern systems deliver 20%–40% energy savings compared to older models, while advanced smart controls provide unprecedented comfort and convenience. Beyond cost savings, today's units excel in indoor air quality, operate more quietly, and offer precision temperature control. This convergence of environmental responsibility, cutting-edge technology, and substantial long-term savings makes upgrading your HVAC system a smart investment for any home.
          </p>
                 
      </article>
      <div className="mt-4 mb-4 text-center">
        <Link to="/" className="home-btn btn btn-primary">
          🏠 Home
        </Link>
      </div>
      </div>
    </div>
  );
};

export default AdvancedAC;
