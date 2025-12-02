import React from "react";
import { Form } from "react-bootstrap";

const CheckboxGroup = ({ title, name, options, onChange }) => {

  const safeOptions = options || {};

  return (
    <>
      <h3 className="mb-4 mt-4">{title}</h3>
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
      <hr className="ms-2 mt-1 mb-5" style={{ width: "66%" }} />
    </>
  );
};

export default CheckboxGroup;