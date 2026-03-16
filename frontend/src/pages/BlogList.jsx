import React, { useReducer, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaNewspaper, FaSearch } from "react-icons/fa";
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
    <div className="bl-page">
      {/* Hero */}
      <div className="bl-hero">
        <div className="bl-hero__inner">
          <div className="bl-hero__icon"><FaNewspaper /></div>
          <h1 className="bl-hero__title">Blogs</h1>
          <p className="bl-hero__sub">Insights, tips and news from the AC-Commerce team.</p>
        </div>
      </div>

      <div className="bl-inner">
        {/* Search */}
        <div className="bl-search-wrap">
          <FaSearch className="bl-search-wrap__icon" />
          <input
            type="search"
            className="bl-search"
            placeholder="Search blogs by subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search blogs by subject"
          />
        </div>

        <div className="blog-container">
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
                  backgroundPosition: "center top",
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

        <div className="bl-home-row">
          <Link to="/" className="home-btn">🏠 Home</Link>
        </div>
      </div>
    </div>
  );
}

export default BlogList;
