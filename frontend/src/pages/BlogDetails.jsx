import React, { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import "./BlogDetails.css";

function BlogDetails() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [progress, setProgress] = useState(0);
  const articleRef = useRef(null);

  useEffect(() => {
    const fetchBlog = async () => {
      const res = await axios.get(`/api/blogs/${id}`);
      setBlog(res.data);
    };
    fetchBlog();
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      const scrolled = Math.max(0, windowH - top);
      const pct = Math.min(100, (scrolled / height) * 100);
      setProgress(pct);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [blog]);

  if (!blog) {
    return (
      <div className="bd-loading">
        <div className="bd-loading__spinner" />
        <p>Loading article…</p>
      </div>
    );
  }

  const readingTime = Math.max(
    1,
    Math.round((blog.content?.replace(/<[^>]+>/g, "").split(/\s+/).length || 0) / 200)
  );

  return (
    <>
      {/* Reading progress bar */}
      <div className="bd-progress" style={{ width: `${progress}%` }} />

      {/* Hero */}
      {blog.image && (
        <div className="bd-hero">
          <img src={blog.image} alt={blog.title} className="bd-hero__img" />
          <div className="bd-hero__overlay" />
          <div className="bd-hero__text">
            <h1 className="bd-hero__title">{blog.title}</h1>
          </div>
        </div>
      )}

      <div className="bd-container">
        {/* Meta row */}
        <div className="bd-meta">
          {blog.author && (
            <span className="bd-meta__item">✍️ {blog.author}</span>
          )}
          {(blog.updatedAt || blog.createdAt) && (
            <span className="bd-meta__item">
              📅 {new Date(blog.updatedAt || blog.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
          <span className="bd-meta__item">⏱️ {readingTime} min read</span>
          {blog.category && (
            <span className="bd-meta__badge">{blog.category}</span>
          )}
        </div>

        {/* Title when no hero image */}
        {!blog.image && (
          <h1 className="bd-title">{blog.title}</h1>
        )}

        {/* Content */}
        <article
          ref={articleRef}
          className="bd-content"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Footer actions */}
        <div className="bd-footer-actions">
          <Link to="/blogs" className="bd-back-btn">
            ← Back to Blogs
          </Link>
          <Link to="/" className="bd-home-btn">
            🏠 Home
          </Link>
        </div>
      </div>
    </>
  );
}

export default BlogDetails;
