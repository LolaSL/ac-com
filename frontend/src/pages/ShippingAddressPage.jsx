import React, { useContext, useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store";
import CheckoutSteps from "../components/CheckoutSteps";
import { FaUser, FaMapMarkerAlt, FaCity, FaMailBulk, FaGlobe, FaMapPin } from "react-icons/fa";
import "./ShippingAddressPage.css";

const COUNTRIES = [
  "United States","Canada","Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

export default function ShippingAddressPage() {
  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    userInfo,
    cart: { shippingAddress },
  } = state;

  const [formData, setFormData] = useState({
    fullName:   shippingAddress.fullName   || "",
    address:    shippingAddress.address    || "",
    city:       shippingAddress.city       || "",
    postalCode: shippingAddress.postalCode || "",
    country:    shippingAddress.country    || "United States",
  });

  const [lat, setLat] = useState(shippingAddress.location?.lat?.toString() || "");
  const [lng, setLng] = useState(shippingAddress.location?.lng?.toString() || "");

  useEffect(() => {
    if (!userInfo) navigate("/signin?redirect=/shipping");
  }, [userInfo, navigate]);

  useEffect(() => {
    ctxDispatch({ type: "SET_FULLBOX_OFF" });
  }, [ctxDispatch]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const submitHandler = (e) => {
    e.preventDefault();
    const location = lat && lng
      ? { lat: parseFloat(lat), lng: parseFloat(lng) }
      : shippingAddress.location;
    ctxDispatch({
      type: "SAVE_SHIPPING_ADDRESS",
      payload: { ...formData, location },
    });
    localStorage.setItem(
      "shippingAddress",
      JSON.stringify({ ...formData, location })
    );
    navigate("/payment");
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported by your browser"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      () => alert("Unable to retrieve your location")
    );
  };

  return (
    <div className="sa-page">
      <CheckoutSteps step1 step2 />

      <div className="sa-hero">
        <h1 className="sa-hero__title">📦 Shipping Address</h1>
        <p className="sa-hero__sub">Where should we deliver your order?</p>
      </div>

      <form onSubmit={submitHandler}>
        <div className="sa-card">
          <div className="sa-card__title">👤 Recipient &amp; Address</div>
          <div className="sa-grid">

            {/* Full Name — full width */}
            <Form.Group controlId="fullName" className="sa-grid--full">
              <Form.Label className="sa-label"><FaUser /> Full Name</Form.Label>
              <Form.Control className="sa-input" value={formData.fullName} onChange={handleChange} placeholder="John Smith" required />
            </Form.Group>

            {/* Street address — full width */}
            <Form.Group controlId="address" className="sa-grid--full">
              <Form.Label className="sa-label"><FaMapMarkerAlt /> Street Address</Form.Label>
              <Form.Control className="sa-input" value={formData.address} onChange={handleChange} placeholder="123 Main St, Suite 4" required />
            </Form.Group>

            {/* City */}
            <Form.Group controlId="city">
              <Form.Label className="sa-label"><FaCity /> City</Form.Label>
              <Form.Control className="sa-input" value={formData.city} onChange={handleChange} placeholder="New York" required />
            </Form.Group>

            {/* Postal code */}
            <Form.Group controlId="postalCode">
              <Form.Label className="sa-label"><FaMailBulk /> Postal / ZIP Code</Form.Label>
              <Form.Control className="sa-input" value={formData.postalCode} onChange={handleChange} placeholder="10001" required />
            </Form.Group>

            {/* Country — full width */}
            <Form.Group controlId="country" className="sa-grid--full">
              <Form.Label className="sa-label"><FaGlobe /> Country</Form.Label>
              <Form.Select className="sa-input" value={formData.country} onChange={handleChange} required>
                <option value="">Select a country…</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Form.Select>
            </Form.Group>

          </div>
        </div>

        {/* Location */}
        <div className="sa-card">
          <div className="sa-card__title"><FaMapPin style={{marginRight:6}}/>GPS Coordinates (optional)</div>
          <div className="sa-grid">
            <Form.Group controlId="lat">
              <Form.Label className="sa-label"><FaMapMarkerAlt /> Latitude</Form.Label>
              <Form.Control className="sa-input" type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g. 40.712800" />
            </Form.Group>
            <Form.Group controlId="lng">
              <Form.Label className="sa-label"><FaMapMarkerAlt /> Longitude</Form.Label>
              <Form.Control className="sa-input" type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="e.g. -74.005900" />
            </Form.Group>
          </div>
          <div className="sa-location" style={{marginTop: 14}}>
            <button type="button" className="sa-location__btn" onClick={handleUseMyLocation}>
              📍 Use My Current Location
            </button>
            {lat && lng
              ? <span className="sa-location__coords">📌 {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}</span>
              : <span className="sa-location__none">No coordinates entered</span>
            }
          </div>
        </div>

        <button type="submit" className="sa-submit-btn">Continue to Payment →</button>
      </form>
    </div>
  );
}
