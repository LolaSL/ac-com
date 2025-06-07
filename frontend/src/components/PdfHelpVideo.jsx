import React from "react";

const PdfHelpVideo = () => {
  return (
    <div>
      <p className="text-secondary text-bold fs-5">
        Watch this short tutorial to learn how to annotate, edit, and download
        your PDF file.
      </p>
      <div className="ratio ratio-16x9">
        <iframe
          width="560"
          height="315"
          src="https://www.youtube.com/embed/-s4pdK35YZk"
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default PdfHelpVideo;
