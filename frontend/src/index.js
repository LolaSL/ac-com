import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import './i18n/index.js';
import App from './App.jsx';
import { StoreProvider } from "./Store.js";
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { GoogleOAuthProvider } from '@react-oauth/google';
import reportWebVitals from './reportWebVitals';
import { GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist';
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ""}>
      <StoreProvider>
        <PayPalScriptProvider deferLoading={true}>
          <App />
        </PayPalScriptProvider>
      </StoreProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);

reportWebVitals();
