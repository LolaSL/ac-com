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
import { FaBlog } from "react-icons/fa";
import "./AdminHero.css";
import "./BlogEditPage.css";

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

const BlogEditPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const { id: blogId } = params;

  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;

  const [{ loading, error, loadingUpdate, loadingUpload }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: "",
    });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [image, setImage] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/blogs/${blogId}`);
        setTitle(data.title);
        setSlug(data.slug);
        setContent(data.content);
        setImage(data.image);
        setShortDescription(data.shortDescription);
        setTagsInput((data.tags || []).join(", "));
        dispatch({ type: "FETCH_SUCCESS" });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchData();
  }, [blogId]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: "UPDATE_REQUEST" });
      await axios.put(
        `/api/blogs/${blogId}`,
        {
          title,
          slug,
          content,
          shortDescription,
          image,
          tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      dispatch({ type: "UPDATE_SUCCESS" });
      toast.success("Blog updated successfully");
      navigate("/admin/blogs-list");
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: "UPDATE_FAIL" });
    }
  };

  const uploadFileHandler = async (e, forImage) => {
    const file = e.target.files[0];
    const bodyFormData = new FormData();
    bodyFormData.append("file", file);
    bodyFormData.append("blogId", blogId);

    try {
      dispatch({ type: "UPLOAD_REQUEST" });
      const { data } = await axios.post("/api/upload", bodyFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
          authorization: `Bearer ${token}`,
        },
      });
      dispatch({ type: "UPLOAD_SUCCESS" });

      if (forImage) {
        setImage(data.secure_url);
      }
      toast.success("Image uploaded successfully. Click Update to apply it");
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: "UPLOAD_FAIL", payload: getError(err) });
    }
  };

  return (
    <div className="adm-page">
      {/* Hero Section */}
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon">
            <FaBlog />
          </div>
          <h1 className="adm-hero__title">Edit Blog Post</h1>
          <p className="adm-hero__sub">
            Update blog title, content, description, and featured image
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="blog-edit-content">
        {loading ? (
          <LoadingBox />
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : (
          <Form onSubmit={submitHandler}>
            <div className="blog-edit-grid">
              {/* Basic Information */}
              <div className="blog-edit-section">
                <h3>
                  <i className="fas fa-info-circle"></i>
                  Basic Information
                </h3>
                <Form.Group className="mb-3" controlId="title">
                  <Form.Label>Blog Title</Form.Label>
                  <Form.Control
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Enter blog title"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="slug">
                  <Form.Label>URL Slug</Form.Label>
                  <Form.Control
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    placeholder="blog-url-slug"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="shortDescription">
                  <Form.Label>Short Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    required
                    placeholder="Enter a brief description for preview cards"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="tags">
                  <Form.Label>Tags</Form.Label>
                  <Form.Control
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. Maintenance, Energy Saving, BTU"
                  />
                  <Form.Text className="text-muted">
                    Separate tags with commas.
                  </Form.Text>
                </Form.Group>
              </div>

              {/* Featured Image */}
              <div className="blog-edit-section">
                <h3>
                  <i className="fas fa-image"></i>
                  Featured Image
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
                    alt="Blog preview"
                    className="blog-image-preview"
                  />
                )}
                <Form.Group className="mb-3 mt-3" controlId="imageFile">
                  <Form.Label>Upload New Image</Form.Label>
                  <Form.Control
                    type="file"
                    onChange={(e) => uploadFileHandler(e, true)}
                    accept="image/*"
                  />
                  {loadingUpload && <LoadingBox />}
                </Form.Group>
              </div>

              {/* Blog Content */}
              <div className="blog-edit-section full-width">
                <h3>
                  <i className="fas fa-align-left"></i>
                  Blog Content
                </h3>
                <Form.Group className="mb-3" controlId="content">
                  <Form.Label>Content</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    placeholder="Enter the full blog content"
                  />
                </Form.Group>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <Button
                disabled={loadingUpdate}
                type="submit"
                className="btn-update-blog w-75"
              >
                {loadingUpdate ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>
                    Update Blog
                  </>
                )}
              </Button>
              <Button
                type="button"
                className="btn-cancel w-75 mx-2"
                onClick={() => navigate("/admin/blogs-list")}
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

export default BlogEditPage;
