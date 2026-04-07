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
import { FaBoxOpen } from "react-icons/fa";
import "./AdminHero.css";
import "./ProductEditPage.css";

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
    case "UPLOAD_REQUEST":
      return { ...state, loadingUpload: true, errorUpload: "" };
    case "UPLOAD_SUCCESS":
      return { ...state, loadingUpload: false, errorUpload: "" };
    case "UPLOAD_FAIL":
      return { ...state, loadingUpload: false, errorUpload: action.payload };
    default:
      return state;
  }
};

const ProductEditPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const { id: productId } = params;

  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;

  const [{ loading, error, loadingUpdate, loadingUpload }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: "",
    });

  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("");
  const [countInStock, setCountInStock] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [mode, setMode] = useState("");
  const [btu, setBtu] = useState("");
  const [areaCoverage, setAreaCoverage] = useState("");
  const [energyEfficiency, setEnergyEfficiency] = useState("");
  const [discount, setDiscount] = useState("");
  const [documents, setDocuments] = useState([]);
  const [dimension, setDimension] = useState({
    width: "",
    height: "",
    depth: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/products/${productId}`);

        setName(data.name);
        setModel(data.model);
        setSlug(data.slug);
        setPrice(data.price);
        setImage(data.image);
        setImages(data.images);
        setCategory(data.category);
        setCountInStock(data.countInStock);
        setBrand(data.brand);
        setDescription(data.description);
        setFeatures(data.features);
        setMode(data.mode);
        setBtu(data.btu);
        setAreaCoverage(data.areaCoverage);
        setEnergyEfficiency(data.energyEfficiency);
        setDiscount(data.discount);
        setDocuments(data.documents || []);
        setDimension({
          width: data.dimension?.width || "",
          height: data.dimension?.height || "",
          depth: data.dimension?.depth || "",
        });

        dispatch({ type: "FETCH_SUCCESS" });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchData();
  }, [productId]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: "UPDATE_REQUEST" });

      await axios.put(
        `/api/products/${productId}`,
        {
          _id: productId,
          name,
          model,
          slug,
          price,
          image,
          images,
          category,
          brand,
          countInStock,
          description,
          features,
          mode,
          btu,
          areaCoverage,
          energyEfficiency,
          discount,
          documents,
          dimension: {
            width: dimension.width,
            height: dimension.height,
            depth: dimension.depth,
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      dispatch({ type: "UPDATE_SUCCESS" });
      toast.success("Product updated successfully");
      navigate("/admin/products");
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: "UPDATE_FAIL" });
    }
  };

  const uploadFileHandler = async (e, forImages) => {
    const file = e.target.files[0];
    const bodyFormData = new FormData();
    bodyFormData.append("file", file);
    bodyFormData.append("productId", productId);

    try {
      dispatch({ type: "UPLOAD_REQUEST" });

      const { data } = await axios.post("/api/upload", bodyFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
          authorization: `Bearer ${token}`,
        },
      });

      dispatch({ type: "UPLOAD_SUCCESS" });

      if (file.type === "application/pdf") {
        setDocuments([
          ...documents,
          { url: data.imageUrl, extractedText: data.extractedText },
        ]);
      } else if (forImages) {
        setImages([...images, data.imageUrl]);
      } else {
        setImage(data.imageUrl);
      }

      toast.success("File uploaded successfully. Click Update to apply it.");
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: "UPLOAD_FAIL", payload: getError(err) });
    }
  };

  const deleteFileHandler = async (fileName, f) => {
    console.log(fileName, f);
    console.log(images);
    console.log(images.filter((x) => x !== fileName));
    setImages(images.filter((x) => x !== fileName));
    toast.success("Image removed successfully. click Update to apply it");
  };

  return (
    <div className="adm-page">
      {/* Hero Section */}
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon">
            <FaBoxOpen />
          </div>
          <h1 className="adm-hero__title">Edit Product</h1>
          <p className="adm-hero__sub">
            Update product information, images, specifications, and pricing
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="product-edit-content">
        {loading ? (
          <LoadingBox />
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : (
          <Form onSubmit={submitHandler}>
            <div className="product-edit-grid">
              {/* Basic Information */}
              <div className="product-edit-section">
                <h3>
                  <i className="fas fa-info-circle"></i>
                  Basic Information
                </h3>
                <Form.Group className="mb-3" controlId="name">
                  <Form.Label>Product Name</Form.Label>
                  <Form.Control
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter product name"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="model">
                  <Form.Label>Model Number</Form.Label>
                  <Form.Control
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                    placeholder="Enter model number"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="slug">
                  <Form.Label>URL Slug</Form.Label>
                  <Form.Control
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    placeholder="product-url-slug"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="brand">
                  <Form.Label>Brand</Form.Label>
                  <Form.Control
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                    placeholder="Enter brand name"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="category">
                  <Form.Label>Category</Form.Label>
                  <Form.Control
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    placeholder="Enter category"
                  />
                </Form.Group>
              </div>

              {/* Pricing & Stock */}
              <div className="product-edit-section">
                <h3>
                  <i className="fas fa-dollar-sign"></i>
                  Pricing & Inventory
                </h3>
                <Form.Group className="mb-3" controlId="price">
                  <Form.Label>Price ($)</Form.Label>
                  <Form.Control
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    placeholder="0.00"
                    step="0.01"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="discount">
                  <Form.Label>Discount (%)</Form.Label>
                  <Form.Control
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="countInStock">
                  <Form.Label>Stock Count</Form.Label>
                  <Form.Control
                    type="number"
                    value={countInStock}
                    onChange={(e) => setCountInStock(e.target.value)}
                    required
                    placeholder="0"
                    min="0"
                  />
                </Form.Group>
              </div>

              {/* Description & Features */}
              <div className="product-edit-section full-width">
                <h3>
                  <i className="fas fa-align-left"></i>
                  Description & Features
                </h3>
                <Form.Group className="mb-3" controlId="description">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder="Enter detailed product description"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="features">
                  <Form.Label>Features</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                    placeholder="Enter product features (comma-separated)"
                  />
                </Form.Group>
              </div>

              {/* Main Image */}
              <div className="product-edit-section">
                <h3>
                  <i className="fas fa-image"></i>
                  Main Image
                </h3>
                <Form.Group className="mb-3" controlId="image">
                  <Form.Label>Image URL</Form.Label>
                  <Form.Control
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    required
                    placeholder="https://example.com/image.jpg"
                  />
                </Form.Group>
                {image && (
                  <img
                    src={image}
                    alt="Product preview"
                    className="product-image-preview"
                  />
                )}
                <Form.Group className="mb-3 mt-3" controlId="imageFile">
                  <Form.Label>Upload New Image</Form.Label>
                  <Form.Control
                    type="file"
                    onChange={(e) => uploadFileHandler(e)}
                    accept="image/*"
                  />
                  {loadingUpload && <LoadingBox />}
                </Form.Group>
              </div>

              {/* Additional Images */}
              <div className="product-edit-section">
                <h3>
                  <i className="fas fa-images"></i>
                  Additional Images
                </h3>
                <Form.Group className="mb-3" controlId="additionalImageFile">
                  <Form.Label>Upload Additional Image</Form.Label>
                  <Form.Control
                    type="file"
                    onChange={(e) => uploadFileHandler(e, true)}
                    accept="image/*"
                  />
                  {loadingUpload && <LoadingBox />}
                </Form.Group>

                {images.length === 0 ? (
                  <MessageBox variant="info">No additional images</MessageBox>
                ) : (
                  <div className="additional-images-grid">
                    {images.map((x) => (
                      <div key={x} className="image-item">
                        <img src={x} alt="Additional" />
                        <p className="image-item-url">{x.substring(x.lastIndexOf('/') + 1)}</p>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteFileHandler(x)}
                          className="image-delete-btn"
                        >
                          <i className="fa fa-trash"></i> Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Technical Specifications */}
              <div className="product-edit-section">
                <h3>
                  <i className="fas fa-cogs"></i>
                  Technical Specifications
                </h3>
                <Form.Group className="mb-3" controlId="mode">
                  <Form.Label>Mode</Form.Label>
                  <Form.Control
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    placeholder="e.g., Cooling/Heating"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="btu">
                  <Form.Label>BTU</Form.Label>
                  <Form.Control
                    type="number"
                    value={btu}
                    onChange={(e) => setBtu(e.target.value)}
                    placeholder="e.g., 12000"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="areaCoverage">
                  <Form.Label>Area Coverage (sq ft)</Form.Label>
                  <Form.Control
                    value={areaCoverage}
                    onChange={(e) => setAreaCoverage(e.target.value)}
                    placeholder="e.g., 500-600"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="energyEfficiency">
                  <Form.Label>Energy Efficiency (SEER)</Form.Label>
                  <Form.Control
                    value={energyEfficiency}
                    onChange={(e) => setEnergyEfficiency(e.target.value)}
                    placeholder="e.g., 16"
                  />
                </Form.Group>
              </div>

              {/* Dimensions */}
              <div className="product-edit-section">
                <h3>
                  <i className="fas fa-ruler-combined"></i>
                  Dimensions
                </h3>
                <div className="dimension-inputs">
                  <Form.Group className="mb-3" controlId="dimensionWidth">
                    <Form.Label>Width (in)</Form.Label>
                    <Form.Control
                      type="number"
                      value={dimension.width}
                      onChange={(e) =>
                        setDimension({ ...dimension, width: e.target.value })
                      }
                      required
                      placeholder="0"
                      step="0.1"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="dimensionHeight">
                    <Form.Label>Height (in)</Form.Label>
                    <Form.Control
                      type="number"
                      value={dimension.height}
                      onChange={(e) =>
                        setDimension({ ...dimension, height: e.target.value })
                      }
                      required
                      placeholder="0"
                      step="0.1"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="dimensionDepth">
                    <Form.Label>Depth (in)</Form.Label>
                    <Form.Control
                      type="number"
                      value={dimension.depth}
                      onChange={(e) =>
                        setDimension({ ...dimension, depth: e.target.value })
                      }
                      required
                      placeholder="0"
                      step="0.1"
                    />
                  </Form.Group>
                </div>
              </div>

              {/* Documents */}
              <div className="product-edit-section full-width">
                <h3>
                  <i className="fas fa-file-pdf"></i>
                  Product Documents
                </h3>
                <Form.Group className="mb-3" controlId="uploadDocument">
                  <Form.Label>Upload Document (PDF)</Form.Label>
                  <Form.Control
                    type="file"
                    onChange={(e) => uploadFileHandler(e, "documents")}
                    accept="application/pdf"
                  />
                  {loadingUpload && <LoadingBox />}
                </Form.Group>

                {documents.length === 0 ? (
                  <MessageBox variant="info">No documents uploaded</MessageBox>
                ) : (
                  <div className="document-list">
                    {documents.map((doc) => (
                      <div key={doc.url} className="document-item">
                        <span className="document-url">
                          <i className="fas fa-file-pdf me-2"></i>
                          {doc.url}
                        </span>
                        <Button
                          className="w-auto"
                          variant="danger"
                          size="sm"
                          onClick={() => deleteFileHandler(doc.url, "documents")}
                        >
                          <i className="fa fa-trash"></i> Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
                  <Button
                    disabled={loadingUpdate}
                type="submit"
                className="btn-update-product w-75"
              >
                {loadingUpdate ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>
                    Update Product
                  </>
                )}
              </Button>
              <Button
                type="button"
                className="btn-cancel w-75"
                onClick={() => navigate("/admin/products")}
              >
                <i className="fas fa-times me-2"></i>
                Cancel
              </Button>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
};

export default ProductEditPage;
