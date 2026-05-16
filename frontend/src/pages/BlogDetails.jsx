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
    <div className="bd-page">
      {/* Reading progress bar */}
      <div className="bd-progress" style={{ width: `${progress}%` }} />

      {/* Hero — gradient frame always renders. When the post has an image, it
          sits inside the gradient frame; otherwise the gradient backdrop fills
          the hero with the title + meta on top. */}
      <div
        className={`bd-hero ${blog.image ? "bd-hero--with-image" : "bd-hero--fallback"} bd-hero--cat-${(blog.category || "default")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}`}
      >
        <div className="bd-hero__shapes" aria-hidden="true">
          <span className="bd-hero__shape bd-hero__shape--a" />
          <span className="bd-hero__shape bd-hero__shape--b" />
          <span className="bd-hero__shape bd-hero__shape--c" />
        </div>

        {blog.image ? (
          <>
            <img src={blog.image} alt={blog.title} className="bd-hero__img" />
            <div className="bd-hero__overlay" />
            <div className="bd-hero__text">
              {blog.category && (
                <span className="bd-hero__eyebrow">{blog.category}</span>
              )}
              <h1 className="bd-hero__title">{blog.title}</h1>
            </div>
          </>
        ) : (
          <div className="bd-hero__text bd-hero__text--center">
            {blog.category && (
              <span className="bd-hero__eyebrow">{blog.category}</span>
            )}
            <h1 className="bd-hero__title">{blog.title}</h1>
            <div className="bd-hero__meta">
              {blog.author && <span>✍️ {blog.author}</span>}
              {(blog.updatedAt || blog.createdAt) && (
                <span>
                  📅 {new Date(blog.updatedAt || blog.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              )}
              <span>⏱️ {readingTime} min read</span>
            </div>
          </div>
        )}
      </div>

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

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="bd-tags">
            {blog.tags.map((tag) => (
              <span key={tag} className="bd-tag">{tag}</span>
            ))}
          </div>
        )}

        {/* Title fallback is rendered inside the gradient hero above when no image. */}

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
    </div>
  );
}

export default BlogDetails;
