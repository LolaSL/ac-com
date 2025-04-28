import { useEffect, useReducer } from "react";
import axios from "axios";
import { getError } from "../utils";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Link } from "react-router-dom";
import { Container } from "react-bootstrap";
import { Card } from "react-bootstrap";

const reducer = (state, action) => {
  switch (action.type) {
    case "REFRESH_PRODUCT":
      return { ...state, sellers: action.payload };
    case "CREATE_REQUEST":
      return { ...state, loadingCreateReview: true };
    case "CREATE_SUCCESS":
      return { ...state, loadingCreateReview: false };
    case "CREATE_FAIL":
      return { ...state, loadingCreateReview: false };
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, sellers: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default function SellersPage() {
  const [{ loading, error, sellers }, dispatch] = useReducer(reducer, {
    sellers: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get("/api/sellers/all");
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchData();
  }, []);
  
  return (
    <Container className="seller-container">
      <h1 className="sellers-title">Suppliers</h1>
      <h2>Air Conditioning Products and VRF Systems</h2>
      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <div>
          {sellers.map((seller, index) => (
            <Card key={index} className="mb-3">
              <div className="mt-4 mb-4">
              {seller.logo ? (
          <div className="logo-container p-4">
           <img src={`${seller.logo}`} alt={`${seller.name} logo`} className="seller-logo" />

          </div>
        ) : (
          <p>No logo available</p>
        )}
                <Link
                  to={`/sellers/${seller._id}`}
                  className="seller-name text-secondary"
                >
                  <h2 className="seller-name p-4">{seller.name}</h2>
                </Link>
                  </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
