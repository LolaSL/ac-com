import React, { useContext, useEffect, useReducer, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import Form from "react-bootstrap/Form";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import Button from "react-bootstrap/Button";
import { FaSellcast } from "react-icons/fa";


const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "UPDATE_REQUEST":
      return { ...state, loadingUpdate: true };
    case "UPDATE_SUCCESS":
      return { ...state, loadingUpdate: false };
    case "UPDATE_FAIL":
      return { ...state, loadingUpdate: false };
    default:
      return state;
  }
};

export default function SellerEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;

  const [{ loading, error, loadingUpdate }, dispatch] = useReducer(reducer, {
    loading: true,
    error: "",
  });

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [info, setInfo] = useState("");
  const [logo, setLogo] = useState("");
  const [companyLink, setCompanyLink] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/sellers/${id}`);
        setName(data.name);
        setBrand(data.brand);
        setInfo(data.info);
        setLogo(data.logo);
        setCompanyLink(data.companyLink);
        dispatch({ type: "FETCH_SUCCESS" });
      } catch (err) {
        dispatch({
          type: "FETCH_FAIL",
          payload: getError(err),
        });
      }
    };

    fetchData();
  }, [id]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: "UPDATE_REQUEST" });
      await axios.put(
        `/api/sellers/${id}`,
        {
          name,
          brand,
          info,
          logo,
          companyLink,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      dispatch({
        type: "UPDATE_SUCCESS",
      });
      toast.success("Seller updated successfully");
      navigate("/admin/sellers");
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: "UPDATE_FAIL" });
    }
  };

  return (
 <div className="adm-page">
  <div className="adm-hero">
    <div className="adm-hero__inner">
      <div className="adm-hero__icon"><FaSellcast /></div>
      <h1 className="adm-hero__title">Edit Seller</h1>
      <p className="adm-hero__sub">
        Update logo, company link, name, brand and seller information
      </p>
    </div>
  </div>

  <div className="adm-inner">
      <div className="sl-edit-card mx-4">

        {loading ? (
          <LoadingBox />
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : (
          <Form onSubmit={submitHandler} className="sl-edit-form">

            {/* Logo Upload */}
            <Form.Group className="mb-4" controlId="logo">
              <Form.Label className="sl-edit-label">Logo</Form.Label>
              <Form.Control
                className="sl-edit-input file-input"
                type="file"
                accept="image/*"
                required
                onChange={(e) => setLogo(e.target.files[0])}
              />
            </Form.Group>

            {/* Grid Fields */}
            <div className="sl-grid">
              <Form.Group controlId="companyLink">
                <Form.Label className="sl-edit-label">Company Link</Form.Label>
                <Form.Control
                  className="sl-edit-input"
                  type="text"
                  value={companyLink}
                  onChange={(e) => setCompanyLink(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group controlId="name">
                <Form.Label className="sl-edit-label">Name</Form.Label>
                <Form.Control
                  className="sl-edit-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group controlId="brand">
                <Form.Label className="sl-edit-label">Brand</Form.Label>
                <Form.Control
                  className="sl-edit-input"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  required
                />
              </Form.Group>
            </div>

            {/* Full width */}
            <Form.Group className="mb-4" controlId="info">
              <Form.Label className="sl-edit-label">Information</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                className="sl-edit-input"
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                required
              />
            </Form.Group>

            {/* Actions */}
            <div className="sl-edit-actions">
              <Button
                type="submit"
                className="sl-edit-save-btn"
                disabled={loadingUpdate}
              >
                {loadingUpdate ? "Saving…" : "Save Changes"}
              </Button>

              <Button
                type="button"
                className="sl-edit-cancel-btn"
                onClick={() => navigate("/admin/sellers")}
              >
                Cancel
              </Button>
            </div>

            {loadingUpdate && <LoadingBox />}
          </Form>
        )}

      </div>

  </div>
 </div>
  );
}
