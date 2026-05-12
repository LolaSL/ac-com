import React from "react";

class AnnotatorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Error in Annotator:", error, info);
  }

  handleRetry() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-danger" style={{ borderRadius: '10px', padding: '1.25rem' }}>
          <strong>⚠️ Annotator failed to load.</strong>
          {this.state.error && (
            <p className="mb-2 mt-1 small text-muted">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
          )}
          <p className="mb-3 small">
            This may be caused by a corrupted PDF, a missing library, or a temporary network issue.
            Try clearing your browser cache or uploading a different PDF file.
          </p>
          <button
            className="btn btn-sm btn-danger me-2"
            onClick={this.handleRetry}
          >
            🔄 Retry
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AnnotatorErrorBoundary;
