import React from "react";
import { Form } from "react-bootstrap";
import "./CheckboxGroup.css";

const CheckboxGroup = ({ title, name, options, onChange }) => {
  const safeOptions = options || {};

  return (
    <div className="checkbox-group">
      <h3>{title}</h3>
      {Object.keys(safeOptions).map((key) => (
        <Form.Check
          key={key}
          type="checkbox"
          label={key.replace(/([A-Z])/g, " $1").trim()}
          name={key}
          checked={safeOptions[key] || false}
          onChange={onChange}
        />
      ))}
      <hr />
    </div>
  );
};

export default CheckboxGroup;