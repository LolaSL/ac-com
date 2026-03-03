import React, { useContext, useEffect, useReducer, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { toast } from "react-toastify";
import { Store } from "../Store.js";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import { getError } from "../utils.js";
import { Table } from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaNewspaper } from "react-icons/fa";
import "./BlogsPage.css";
import "./AdminHero.css";

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
    case "CREATE_REQUEST":
      return { ...state, loadingCreate: true };
    case "CREATE_SUCCESS":
      return {
        ...state,
        loadingCreate: false,
      };
    case "CREATE_FAIL":
      return { ...state, loadingCreate: false };

    case "DELETE_REQUEST":
      return { ...state, loadingDelete: true, successDelete: false };
    case "DELETE_SUCCESS":
      return {
        ...state,
        loadingDelete: false,
        successDelete: true,
      };
    case "DELETE_FAIL":
      return { ...state, loadingDelete: false, successDelete: false };

    case "DELETE_RESET":
      return { ...state, loadingDelete: false, successDelete: false };
    default:
      return state;
  }
};

export default function BlogsPage() {
  const [
    { loading, error, blogs = [], pages, loadingCreate, loadingDelete, successDelete },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    error: "",
  });

  const navigate = useNavigate();
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const currentPage = sp.get("page") || 1;

  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/blogs?page=${currentPage}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    if (successDelete) {
      dispatch({ type: "DELETE_RESET" });
    } else {
      fetchData();
    }
  }, [currentPage, userInfo, successDelete, token]);

  const createHandler = async () => {
    if (window.confirm("Are you sure to create?")) {
      try {
        dispatch({ type: "CREATE_REQUEST" });
        const { data } = await axios.post(
          `/api/blogs`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success("Blog created successfully");
        dispatch({ type: "CREATE_SUCCESS" });
        navigate(`/admin/blog/${data.blog._id}`);
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "CREATE_FAIL" });
      }
    }
  };

  const deleteHandler = async (blog) => {
    if (window.confirm("Are you sure to delete?")) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/blogs/${blog._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("blog deleted successfully");
        dispatch({ type: "DELETE_SUCCESS" });
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "DELETE_FAIL" });
      }
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon"><FaNewspaper /></div>
          <h1 className="adm-hero__title">Blogs Management</h1>
          <p className="adm-hero__sub">Create, edit and publish blog articles.</p>
        </div>
      </div>
      <div className="adm-inner">
        <div className="d-flex justify-content-end mb-4">
          <Button className="btn-admin-action" onClick={createHandler} disabled={loadingCreate}>
            <FaPlus className="me-2" />
            {loadingCreate ? "Creating..." : "Create Blog"}
          </Button>
        </div>

      <InputGroup className="mb-4 admin-search-box">
        <InputGroup.Text className="admin-search-icon">
          <FaSearch />
        </InputGroup.Text>
        <Form.Control
          placeholder="Search by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="admin-search-input"
        />
      </InputGroup>

      {loadingCreate && <LoadingBox />}
      {loadingDelete && <LoadingBox />}

      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <>
        <div className="table-responsive admin-table-wrapper">
          <Table striped bordered hover className="admin-table">
            <thead className="admin-table-header">
              <tr>
                <th>ID</th>
                <th>TITLE</th>
                <th>DESCRIPTION</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {blogs
                .filter((blog) =>
                  blog.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((blog) => (
                  <tr key={blog._id} className="admin-table-row">
                    <td data-label="ID" className="small-text">
                      {blog._id}
                    </td>
                    <td data-label="Title" className="title-cell">
                      {blog.title}
                    </td>
                    <td data-label="Description" className="desc-cell">
                      {blog.shortDescription?.substring(0, 60)}
                      {blog.shortDescription?.length > 60 ? "..." : ""}
                    </td>
                    <td className="actions-cell">
                      <Button
                        variant="sm"
                        className="btn-admin-edit"
                        onClick={() => navigate(`/admin/blog/${blog._id}`)}
                        title="Edit blog"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="sm"
                        className="btn-admin-delete ms-2"
                        onClick={() => deleteHandler(blog)}
                        title="Delete blog"
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>
          <div className="d-flex justify-content-center mt-3">
            <nav>
              <ul className="pagination">
                <li className={`page-item ${Number(currentPage) === 1 ? "disabled" : ""}`}>
                  <Link className="page-link" to={`/admin/blogs-list?page=${Number(currentPage) - 1}`}>
                    &lt;
                  </Link>
                </li>
                {[...Array(pages).keys()].map((x) => (
                  <li
                    key={x + 1}
                    className={`page-item ${x + 1 === Number(currentPage) ? "active" : ""}`}
                  >
                    <Link className="page-link" to={`/admin/blogs-list?page=${x + 1}`}>
                      {x + 1}
                    </Link>
                  </li>
                ))}
                <li className={`page-item ${Number(currentPage) === pages ? "disabled" : ""}`}>
                  <Link className="page-link" to={`/admin/blogs-list?page=${Number(currentPage) + 1}`}>
                    &gt;
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
      </>
      )}
      </div>
    </div>
  );
}
