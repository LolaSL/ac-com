import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Store } from '../Store';

export default function AdminRoute({ children }) {

  const { state } = useContext(Store);
  const { userInfo } = state;

  if (userInfo && userInfo.isAdmin) {
    return children;
  }

  
  const serviceProviderInfo = localStorage.getItem('serviceProviderInfo')
    ? JSON.parse(localStorage.getItem('serviceProviderInfo'))
    : null;

  if (serviceProviderInfo && serviceProviderInfo.token) {
  
    return children;
  }

  return <Navigate to="/signin" />;
}
