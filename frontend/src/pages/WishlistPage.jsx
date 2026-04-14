import { useContext, useEffect, useReducer, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Store } from "../Store";
import { toast } from "react-toastify";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Modal from "react-bootstrap/Modal";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import Rating from "../components/Rating";
import {
  FaHeart, FaTrashAlt, FaThLarge, FaTimes, FaPlus,
  FaExchangeAlt, FaEllipsisH, FaPen, FaCheckCircle,
} from "react-icons/fa";
import "./WishlistPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, wishlistItems: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "REMOVE_ITEM":
      return {
        ...state,
        wishlistItems: state.wishlistItems.filter(
          (item) => item.product && item.product._id !== action.payload
        ),
      };
    default:
      return state;
  }
};

export default function WishlistPage() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;

  const [{ loading, error, wishlistItems }, dispatch] = useReducer(reducer, {
    loading: true,
    error: "",
    wishlistItems: [],
  });

  /* ── Collections state ── */
  const [collections, setCollections] = useState([]);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [showNewCol, setShowNewCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [creatingCol, setCreatingCol] = useState(false);

  /* ── Collection menu (rename / delete) ── */
  const [menuCol, setMenuCol] = useState(null);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef(null);

  // Only items with a valid product
  const validWishlistItems = wishlistItems.filter((item) => item.product);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    if (!menuCol) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuCol(null);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [menuCol]);

  /* ── Fetch collections ── */
  const fetchCollections = useCallback(async () => {
    if (!userInfo) return;
    try {
      const { data } = await axios.get("/api/wishlist/collections", {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setCollections(data);
      // Auto-select first (default) if nothing selected
      if (!activeCollectionId && data.length > 0) {
        setActiveCollectionId(data[0]._id);
      }
    } catch {
      /* silent */
    }
  }, [userInfo, activeCollectionId]);

  /* ── Fetch items for active collection ── */
  const fetchItems = useCallback(async () => {
    if (!userInfo || !activeCollectionId) return;
    try {
      dispatch({ type: "FETCH_REQUEST" });
      const { data } = await axios.get(
        `/api/wishlist?collectionId=${activeCollectionId}`,
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      dispatch({
        type: "FETCH_FAIL",
        payload: err.response?.data?.message || "Failed to fetch wishlist",
      });
    }
  }, [userInfo, activeCollectionId]);

  useEffect(() => {
    if (!userInfo) {
      navigate("/signin?redirect=/wishlist");
      return;
    }
    fetchCollections();
  }, [userInfo, navigate, fetchCollections]);

  useEffect(() => {
    if (activeCollectionId) fetchItems();
  }, [activeCollectionId, fetchItems]);

  /* ── Remove item ── */
  const removeFromWishlistHandler = async (productId) => {
    try {
      await axios.delete(`/api/wishlist/${productId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: "REMOVE_ITEM", payload: productId });
      // Update collection counts
      setCollections((prev) =>
        prev.map((c) =>
          c._id === activeCollectionId
            ? { ...c, itemCount: Math.max(0, c.itemCount - 1) }
            : c
        )
      );
      toast.success("Removed from wishlist");
    } catch {
      toast.error("Failed to remove item from wishlist");
    }
  };

  const addToCartHandler = async (product) => {
    const { data } = await axios.get(`/api/products/${product._id}`);
    if (data.countInStock < 1) {
      toast.error("Sorry. Product is out of stock");
      return;
    }
    navigate(`/product/${product.slug}`);
  };

  /* ── Create collection ── */
  const handleCreateCollection = async () => {
    if (!newColName.trim()) return;
    setCreatingCol(true);
    try {
      const { data } = await axios.post(
        "/api/wishlist/collections",
        { name: newColName.trim() },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      setCollections((prev) => [...prev, data]);
      setNewColName("");
      setShowNewCol(false);
      toast.success(`"${data.name}" created`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create collection");
    } finally {
      setCreatingCol(false);
    }
  };

  /* ── Rename collection ── */
  const handleRenameCollection = async () => {
    if (!menuCol || !renameValue.trim()) return;
    try {
      const { data } = await axios.put(
        `/api/wishlist/collections/${menuCol._id}`,
        { name: renameValue.trim() },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      setCollections((prev) =>
        prev.map((c) => (c._id === data._id ? { ...c, name: data.name } : c))
      );
      setShowRename(false);
      setMenuCol(null);
      toast.success("Collection renamed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to rename");
    }
  };

  /* ── Delete collection ── */
  const handleDeleteCollection = async (col) => {
    try {
      await axios.delete(`/api/wishlist/collections/${col._id}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setCollections((prev) => prev.filter((c) => c._id !== col._id));
      setMenuCol(null);
      // Switch to default
      const def = collections.find((c) => c.isDefault);
      if (def) setActiveCollectionId(def._id);
      toast.success("Collection deleted, items moved to default");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  /* ── Long-press modal (small screens) ── */
  const [lpItem, setLpItem] = useState(null);
  const lpTimer = useRef(null);

  const handleTouchStart = useCallback((product) => {
    lpTimer.current = setTimeout(() => setLpItem(product), 200);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (lpTimer.current) clearTimeout(lpTimer.current);
  }, []);

  const handleDeleteFromModal = async () => {
    if (!lpItem) return;
    await removeFromWishlistHandler(lpItem._id);
    setLpItem(null);
  };

  const handleSimilarItems = () => {
    if (!lpItem) return;
    setLpItem(null);
    navigate(`/search?category=${encodeURIComponent(lpItem.category || "")}`);
  };

  /* ── Move-to-collection modal ── */
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveProduct, setMoveProduct] = useState(null);

  const openMoveModal = (product) => {
    setMoveProduct(product);
    setLpItem(null);
    setShowMoveModal(true);
  };

  const handleMoveToCollection = async (colId) => {
    if (!moveProduct) return;
    try {
      await axios.put(
        "/api/wishlist/move",
        { productId: moveProduct._id, collectionId: colId },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      toast.success("Item moved");
      setShowMoveModal(false);
      setMoveProduct(null);
      fetchItems();
      fetchCollections();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to move item");
    }
  };

  const activeCollection = collections.find((c) => c._id === activeCollectionId);

  return (
    <div className="wl-page">
      <div className="wl-hero">
        <div className="wl-hero__inner">
          <div className="wl-hero__icon"><FaHeart /></div>
          <h1 className="wl-hero__title">My Wishlist</h1>
          <p className="wl-hero__sub">Organize your saved products into collections.</p>
        </div>
      </div>
      <div className="wl-inner">

        {/* ── Collection tabs ── */}
        <div className="wl-tabs">
          <div className="wl-tabs__scroll">
            {collections.map((col) => (
              <div key={col._id} className="wl-tabs__tab-wrap" ref={menuCol?._id === col._id ? menuRef : undefined}>
                <button
                  className={`wl-tabs__tab ${col._id === activeCollectionId ? "wl-tabs__tab--active" : ""}`}
                  onClick={() => setActiveCollectionId(col._id)}
                >
                  <span className="wl-tabs__tab-name">{col.name}</span>
                  <span className="wl-tabs__tab-count">{col.itemCount}</span>
                  {!col.isDefault && (
                    <span
                      className="wl-tabs__tab-menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuCol(menuCol?._id === col._id ? null : col);
                      }}
                    >
                      <FaEllipsisH />
                    </span>
                  )}
                </button>

                {/* Dropdown menu */}
                {menuCol && menuCol._id === col._id && (
                  <div className="wl-tabs__dropdown">
                    <button onClick={() => { setRenameValue(col.name); setShowRename(true); setMenuCol(null); }}>
                      <FaPen className="me-2" /> Rename
                    </button>
                    <button onClick={() => { handleDeleteCollection(col); }}>
                      <FaTrashAlt className="me-2" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button className="wl-tabs__add" onClick={() => setShowNewCol(true)}>
              <FaPlus />
            </button>
          </div>
        </div>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : validWishlistItems.length === 0 ? (
        <div className="text-center py-5">
          <p className="wl-empty-msg">
            {activeCollection && !activeCollection.isDefault
              ? `"${activeCollection.name}" is empty`
              : "Your wishlist is empty"}
          </p>
          <Button as={Link} to="/search" variant="primary" size="lg" className="go-to-btn btn-text w-auto fs-4">
            Check new arrivals
          </Button>
        </div>
      ) : (
        <Row className="g-3 mx-0">
          {validWishlistItems.map((item) => (
            <Col key={item._id} xs={12} sm={6} md={4} lg={3} className="p-2">
              <Card
                className="h-100 wl-card"
                onTouchStart={() => handleTouchStart(item.product)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
              >
                <div className="wl-card__img-wrap">
                  <Link to={`/product/${item.product.slug}`}>
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      className="wl-card__img"
                    />
                  </Link>
                  <button
                    onClick={() => removeFromWishlistHandler(item.product._id)}
                    className="wl-card__remove"
                  >
                    <i className="fas fa-heart wl-card__remove-icon" />
                  </button>
                  {item.product.discount > 0 && (
                    <span className="wl-card__discount">
                      {item.product.discount}% OFF
                    </span>
                  )}
                </div>

                <Card.Body className="d-flex flex-column wl-card__body">
                  <span className="wl-card__brand">{item.product.brand}</span>

                  <Link
                    to={`/product/${item.product.slug}`}
                    className="text-decoration-none"
                  >
                    <Card.Title className="wl-card__name">
                      {item.product.name}
                    </Card.Title>
                  </Link>

                  <div className="wl-card__rating">
                    <Rating
                      rating={item.product.rating}
                      numReviews={item.product.numReviews}
                    />
                  </div>

                  <div className="wl-card__price">
                    {item.product.discount > 0 ? (
                      <>
                        <span className="wl-card__price--old">
                          ${item.product.price.toFixed(2)}
                        </span>
                        <span className="wl-card__price--sale">
                          $
                          {(
                            (item.product.price *
                              (100 - item.product.discount)) /
                            100
                          ).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="wl-card__price--current">
                        ${item.product.price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-2">
                    {item.product.countInStock === 0 ? (
                      <Button variant="secondary" disabled className="w-100 wl-card__oos-btn">
                        Out of Stock
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => addToCartHandler(item.product)}
                        className="w-100 wl-view-product-btn"
                      >
                        View Product
                        <i className="fas fa-arrow-right ms-2"></i>
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {validWishlistItems.length > 0 && (
        <div className="mt-4">
          <p className="text-muted">
            <i className="fas fa-info-circle me-2"></i>
            You have {validWishlistItems.length} product
            {validWishlistItems.length !== 1 ? "s" : ""} in this collection
          </p>
        </div>
      )}
      </div>

      {/* ── Long-press action modal ── */}
      <Modal
        show={!!lpItem}
        onHide={() => setLpItem(null)}
        centered
        className="wl-lp-modal"
        size="sm"
      >
        {lpItem && (
          <Modal.Body className="wl-lp-modal__body">
            <button className="wl-lp-modal__close" onClick={() => setLpItem(null)}>
              <FaTimes />
            </button>
            <div className="wl-lp-modal__thumb">
              <img src={lpItem.image} alt={lpItem.name} />
            </div>
            <p className="wl-lp-modal__name">{lpItem.name}</p>

            <button className="wl-lp-modal__btn wl-lp-modal__btn--delete" onClick={handleDeleteFromModal}>
              <FaTrashAlt className="me-2" />
              Delete from my wishlist
            </button>
            {collections.length > 1 && (
              <button className="wl-lp-modal__btn wl-lp-modal__btn--move" onClick={() => openMoveModal(lpItem)}>
                <FaExchangeAlt className="me-2" />
                Move to another list
              </button>
            )}
            <button className="wl-lp-modal__btn wl-lp-modal__btn--similar" onClick={handleSimilarItems}>
              <FaThLarge className="me-2" />
              Similar items
            </button>
          </Modal.Body>
        )}
      </Modal>

      {/* ── Move-to-collection modal ── */}
      <Modal
        show={showMoveModal}
        onHide={() => { setShowMoveModal(false); setMoveProduct(null); }}
        centered
        className="wl-lp-modal"
        size="sm"
      >
        <Modal.Body className="wl-lp-modal__body">
          <button className="wl-lp-modal__close" onClick={() => { setShowMoveModal(false); setMoveProduct(null); }}>
            <FaTimes />
          </button>
          <p className="wl-lp-modal__name" style={{ marginTop: "0.5rem" }}>Move to…</p>
          {collections
            .filter((c) => c._id !== activeCollectionId)
            .map((col) => (
              <button
                key={col._id}
                className="wl-lp-modal__btn wl-lp-modal__btn--move-target"
                onClick={() => handleMoveToCollection(col._id)}
              >
                <FaCheckCircle className="me-2" />
                {col.name}
              </button>
            ))}
        </Modal.Body>
      </Modal>

      {/* ── Create collection modal ── */}
      <Modal
        show={showNewCol}
        onHide={() => { setShowNewCol(false); setNewColName(""); }}
        centered
        className="wl-lp-modal"
        size="sm"
      >
        <Modal.Body className="wl-lp-modal__body">
          <button className="wl-lp-modal__close" onClick={() => { setShowNewCol(false); setNewColName(""); }}>
            <FaTimes />
          </button>
          <p className="wl-lp-modal__name" style={{ marginTop: "0.5rem" }}>New Collection</p>
          <input
            className="wl-col-input"
            type="text"
            placeholder="e.g. Office Renovation"
            maxLength={60}
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
            autoFocus
          />
          <button
            className="wl-lp-modal__btn wl-lp-modal__btn--similar"
            onClick={handleCreateCollection}
            disabled={creatingCol || !newColName.trim()}
            style={{ marginTop: "0.75rem" }}
          >
            <FaPlus className="me-2" />
            {creatingCol ? "Creating…" : "Create Collection"}
          </button>
        </Modal.Body>
      </Modal>

      {/* ── Rename collection modal ── */}
      <Modal
        show={showRename}
        onHide={() => { setShowRename(false); setMenuCol(null); }}
        centered
        className="wl-lp-modal"
        size="sm"
      >
        <Modal.Body className="wl-lp-modal__body">
          <button className="wl-lp-modal__close" onClick={() => { setShowRename(false); setMenuCol(null); }}>
            <FaTimes />
          </button>
          <p className="wl-lp-modal__name" style={{ marginTop: "0.5rem" }}>Rename Collection</p>
          <input
            className="wl-col-input"
            type="text"
            maxLength={60}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenameCollection()}
            autoFocus
          />
          <button
            className="wl-lp-modal__btn wl-lp-modal__btn--similar"
            onClick={handleRenameCollection}
            disabled={!renameValue.trim()}
            style={{ marginTop: "0.75rem" }}
          >
            <FaPen className="me-2" />
            Rename
          </button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
