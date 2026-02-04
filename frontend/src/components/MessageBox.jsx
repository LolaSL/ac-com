import React from "react";
import Alert from "react-bootstrap/Alert";
import "./MessageBox.css";

export default function MessageBox(props) {
  return (
    <Alert variant={props.variant || "secondary"} className="message-box">
      {props.children}
    </Alert>
  );
}
