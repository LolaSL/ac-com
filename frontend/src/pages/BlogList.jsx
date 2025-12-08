import React, { useReducer, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Container from "react-bootstrap/Container";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";

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

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const result = await axios.get("/api/blogs");
        dispatch({ type: "FETCH_SUCCESS", payload: result.data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: err.message });
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <Container fluid className="c-4">
        <h1 className="blogs-title pt-4 mb-4">Blogs</h1>

        <div className="blog-container pt-4 mb-4">
          {loading ? (
            <LoadingBox />
          ) : error ? (
            <MessageBox variant="danger">{error}</MessageBox>
          ) : (
            blogs.map((blog) => (
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
