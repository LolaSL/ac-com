import React from "react";
import { Form } from "react-bootstrap";
const CheckboxGroup = ({ title, name, options, onChange }) => {
    return (
      <>
        <h3 className="mb-3 mt-3">{title}</h3>
        {Object.keys(options).map((key) => (
          <Form.Check
            key={key}
            type="checkbox"
            label={key.replace(/([A-Z])/g, " $1").trim()} 
            name={key}
            checked={options[key]}
            onChange={onChange}
          />
        ))}
        <hr className="ms-2 mt-1 mb-5" style={{ width: "66%" }} />
      </>
    );
  };
export default CheckboxGroup;