import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Store } from '../Store.js';


export default function ProtectedRoute({ children, adminOnly = false }) {
  const { state } = useContext(Store);
  const { userInfo, serviceProviderInfo, adminInfo } = state;
  const location = useLocation();

  if (adminOnly) {
    if (adminInfo) {
      return children;
    }
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (userInfo || serviceProviderInfo || adminInfo) {
    return children;
  }

  return <Navigate to="/signin" state={{ from: location }} replace />;
}


