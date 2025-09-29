import React from "react";

class AnnotatorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Error in Annotator:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div className="alert alert-danger">Annotator failed to load.</div>;
    }

    return this.props.children;
  }
}

export default AnnotatorErrorBoundary;
