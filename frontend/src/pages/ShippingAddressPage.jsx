import React, { useContext, useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { useNavigate } from 'react-router-dom';
import { Store } from '../Store';
import CheckoutSteps from '../components/CheckoutSteps';

export default function ShippingAddressPage() {
  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    fullBox,
    userInfo,
    cart: { shippingAddress },
  } = state;

  const [formData, setFormData] = useState({
    fullName: shippingAddress.fullName || '',
    address: shippingAddress.address || '',
    city: shippingAddress.city || '',
    postalCode: shippingAddress.postalCode || '',
    country: shippingAddress.country || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userInfo) {
      navigate('/signin?redirect=/shipping');
    }
  }, [userInfo, navigate]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [id]: value }));
  };

  const submitHandler = (e) => {
    e.preventDefault();
    ctxDispatch({
      type: 'SAVE_SHIPPING_ADDRESS',
      payload: { ...formData, location: shippingAddress.location },
    });
    localStorage.setItem('shippingAddress', JSON.stringify({
      ...formData,
      location: shippingAddress.location,
    }));
    navigate('/payment');
  };

  useEffect(() => {
    ctxDispatch({ type: 'SET_FULLBOX_OFF' });
  }, [ctxDispatch, fullBox]);

  const handleChooseLocation = () => {
    setIsLoading(true);
    navigate('/map', { replace: true });
  };

  return (
    <div className="p-4">
      <CheckoutSteps step1 step2></CheckoutSteps>
      <div className="container small-container">
        <h1 className="my-3">Shipping Address</h1>
        <Form onSubmit={submitHandler}>
          {['fullName', 'address', 'city', 'postalCode', 'country'].map((field) => (
            <Form.Group className="mb-3" controlId={field} key={field}>
              <Form.Label>{field.replace(/([A-Z])/g, ' $1').trim()}</Form.Label>
              <Form.Control
                value={formData[field]}
                onChange={handleChange}
                required
              />
            </Form.Group>
          ))}

          <div className="mb-3">
            <Button
              id="chooseOnMap"
              type="button"
              variant="light"
              onClick={handleChooseLocation}
              disabled={isLoading}
            >
              {isLoading ? 'Loading Map...' : 'Choose Location On Map'}
            </Button>
            {shippingAddress.location && shippingAddress.location.lat ? (
              <div>
                LAT: {shippingAddress.location.lat} LNG: {shippingAddress.location.lng}
              </div>
            ) : (
              <div>No location</div>
            )}
          </div>

          <div className="mb-3">
            <Button variant="secondary" type="submit" className="btn btn-secondary">
              Continue
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}