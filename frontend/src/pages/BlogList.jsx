import React, { useReducer, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Container from "react-bootstrap/Container";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import "./BlogList.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        blogs: action.payload.blogs,
        page: action.payload.page,
        pages: action.payload.pages,
        loading: false,
      };

    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

function BlogList() {
  const [{ loading, error, blogs = [] }, dispatch] = useReducer(reducer, {
    blogs: [],
    loading: true,
    error: "",
  });

  // ...existing code...

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let didCancel = false;
    let timer = null;
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const result = await axios.get(`/api/blogs`);
        if (!didCancel)
          dispatch({ type: "FETCH_SUCCESS", payload: result.data });
      } catch (err) {
        if (!didCancel) dispatch({ type: "FETCH_FAIL", payload: err.message });
      }
    };
    timer = setTimeout(fetchData, 300);
    return () => {
      didCancel = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Filter blogs by subject (title) only
  const filteredBlogs = blogs.filter(
    (blog) =>
      blog.title && blog.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Container fluid className="c-4">
        <h1 className="blogs-title pt-4 mb-4 fs-1">Blogs</h1>
        <div className="d-flex align-items-center mt-4 mb-3">
          <div style={{ flex: "1 1 auto", marginLeft: 16 }}>
            <input
              type="search"
              className="form-control w-auto"
              placeholder="Search blogs by subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search blogs by subject"
            />
          </div>
        </div>

        <div className="blog-container pt-4 mb-4">
          {loading ? (
            <LoadingBox />
          ) : error ? (
            <MessageBox variant="danger">{error}</MessageBox>
          ) : (
            filteredBlogs.map((blog) => (
              <div
                key={blog._id}
                className="blog-item"
                style={{
                  backgroundImage: `url(${blog.image})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="blog-content">
                  <h2 className="blog-title">{blog.title}</h2>
                  <p className="blog-description">{blog.shortDescription}</p>
                  <Link to={`/blogs/${blog._id}`} className="blog-link">
                    Read More
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </Container>
      <div className="mt-4 mb-4 text-center">
        <Link to="/" className="go-to-btn btn-text">
          Back to Home
        </Link>
      </div>
    </>
  );
}

export default BlogList;
