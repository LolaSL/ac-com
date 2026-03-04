import React, { useContext, useEffect, useState, useRef, useCallback } from "react";
import Form from "react-bootstrap/Form";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store";
import CheckoutSteps from "../components/CheckoutSteps";
import { FaUser, FaMapMarkerAlt, FaCity, FaMailBulk, FaGlobe, FaMapPin, FaSpinner, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
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
  const [geoStatus, setGeoStatus] = useState("idle"); // idle | loading | found | error
  const debounceRef = useRef(null);
  const autoGeocodedRef = useRef(false);

  useEffect(() => {
    if (!userInfo) navigate("/signin?redirect=/shipping");
  }, [userInfo, navigate]);

  useEffect(() => {
    ctxDispatch({ type: "SET_FULLBOX_OFF" });
  }, [ctxDispatch]);

  // Auto-geocode via free OpenStreetMap Nominatim (no API key needed)
  const geocodeAddress = useCallback(async (address, city, country) => {
    if (!city.trim() || !country.trim()) return;
    setGeoStatus("loading");
    try {
      const tryFetch = async (q) => {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
          { headers: { "Accept-Language": "en", "User-Agent": "ac-commerce-app/1.0" } }
        );
        return res.json();
      };

      // Try full address first, fall back to city+country
      let data = address.trim() ? await tryFetch(`${address}, ${city}, ${country}`) : [];
      if (!data || data.length === 0) data = await tryFetch(`${city}, ${country}`);

      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat).toFixed(6));
        setLng(parseFloat(data[0].lon).toFixed(6));
        autoGeocodedRef.current = true;
        setGeoStatus("found");
      } else {
        setGeoStatus("error");
      }
    } catch {
      setGeoStatus("error");
    }
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    const updated = { ...formData, [id]: value };
    setFormData(updated);

    // Clear auto-coords when address fields change
    if (["address", "city", "country"].includes(id) && autoGeocodedRef.current) {
      setLat("");
      setLng("");
      autoGeocodedRef.current = false;
      setGeoStatus("idle");
    }

    // Debounce geocoding — fires 900ms after user stops typing
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const a  = id === "address" ? value : updated.address;
      const c  = id === "city"    ? value : updated.city;
      const co = id === "country" ? value : updated.country;
      if (c.trim() && co.trim()) geocodeAddress(a, c, co);
    }, 900);
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
        autoGeocodedRef.current = false;
        setGeoStatus("found");
      },
      () => alert("Unable to retrieve your location")
    );
  };

  const geoStatusEl = () => {
    if (geoStatus === "loading") return (
      <span className="sa-location__coords" style={{ color: "#888" }}>
        <FaSpinner style={{ marginRight: 5, animation: "spin 1s linear infinite" }} />Locating address…
      </span>
    );
    if (geoStatus === "found" && lat && lng) return (
      <span className="sa-location__coords">
        <FaCheckCircle style={{ color: "#28a745", marginRight: 5 }} />
        📍 {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
      </span>
    );
    if (geoStatus === "error") return (
      <span className="sa-location__none" style={{ color: "#dc3545" }}>
        <FaExclamationCircle style={{ marginRight: 5 }} />Address not found — enter coordinates manually or use GPS
      </span>
    );
    if (lat && lng) return <span className="sa-location__coords">📍 {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}</span>;
    return <span className="sa-location__none">Coordinates auto-fill when address is entered</span>;
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
              <Form.Control
                className="sa-input"
                type="number"
                step="any"
                value={lat}
                onChange={e => { setLat(e.target.value); autoGeocodedRef.current = false; setGeoStatus(e.target.value ? "found" : "idle"); }}
                placeholder="Auto-filled from address"
              />
            </Form.Group>
            <Form.Group controlId="lng">
              <Form.Label className="sa-label"><FaMapMarkerAlt /> Longitude</Form.Label>
              <Form.Control
                className="sa-input"
                type="number"
                step="any"
                value={lng}
                onChange={e => { setLng(e.target.value); autoGeocodedRef.current = false; setGeoStatus(e.target.value ? "found" : "idle"); }}
                placeholder="Auto-filled from address"
              />
            </Form.Group>
          </div>
          <div className="sa-location" style={{marginTop: 14}}>
            <button type="button" className="sa-location__btn" onClick={handleUseMyLocation}>
              📍 Use My Current Location
            </button>
            {geoStatusEl()}
          </div>
        </div>

        <button type="submit" className="sa-submit-btn">Continue to Payment →</button>
      </form>
    </div>
  );
}
