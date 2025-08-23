// import React, { useMemo } from "react";
// import { Form, Button } from "react-bootstrap";
// import { Stage, Layer, Rect, Line, Text } from "react-konva";

// const Annotator1 = ({
//   fileInputRef,
//   handleChange,
//   loading,
//   scriptsLoaded,
//   results,
//   filterText,
//   setFilterText,
//   sortKey,
//   setSortKey,
//   sortOrder,
//   setSortOrder,
//   handleExportExcelStyled,
//   showRoomOverlays,
//   setShowRoomOverlays,
//   previewUrl,
//   canvasRef,
//   stageRef,
//   pdfSize,
//   handleCanvasEvent,
//   handleStageClick,
//   handleRectangleRightClick,
//   rectangles,
//   setRectangles,
//   lines,
//   comments,
//   handleDragMove,
//   handleDragEnd,
//   handleTouchStart,
//   rotateRectangle,
//   isRotating,
//   file,
//   saveToBackend,
//   isSaving,
//   clearCanvas,
//   error,
//   roomColorRectangles,
//   pdfInfo,
// }) => {
//   // Memoized filtered and sorted rooms
//   const filteredRooms = useMemo(() => {
//     return (results?.[0]?.rooms || [])
//       .filter((room) => {
//         const sqft = parseFloat((room.areaSqFt || "").replace(/[^\d.]/g, ""));
//         const sqm = parseFloat((room.areaSqM || "").replace(/[^\d.]/g, ""));
//         return sqft >= 50 && sqm >= 4.65 &&
//           room.roomType?.toLowerCase().includes(filterText.toLowerCase());
//       })
//       .sort((a, b) => {
//         let aVal, bVal;
//         switch (sortKey) {
//           case "roomType":
//             aVal = a.roomType?.toLowerCase() || "";
//             bVal = b.roomType?.toLowerCase() || "";
//             return sortOrder === "asc"
//               ? aVal.localeCompare(bVal)
//               : bVal.localeCompare(aVal);
//           case "width":
//             aVal = parseFloat((a.width || "").replace(/[^\d.]/g, ""));
//             bVal = parseFloat((b.width || "").replace(/[^\d.]/g, ""));
//             break;
//           case "height":
//             aVal = parseFloat((a.height || "").replace(/[^\d.]/g, ""));
//             bVal = parseFloat((b.height || "").replace(/[^\d.]/g, ""));
//             break;
//           case "areaSqft":
//             aVal = parseFloat((a.areaSqFt || "").replace(/[^\d.]/g, ""));
//             bVal = parseFloat((b.areaSqFt || "").replace(/[^\d.]/g, ""));
//             break;
//           case "areaSqm":
//             aVal = parseFloat((a.areaSqM || "").replace(/[^\d.]/g, ""));
//             bVal = parseFloat((b.areaSqM || "").replace(/[^\d.]/g, ""));
//             break;
//           default:
//             return 0;
//         }
//         return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
//       });
//   }, [results, filterText, sortKey, sortOrder]);

//   return (
//     <div>
//       <Form className="btu-calculation-measure mt-4">
//         <Form.Label className="label-upload fw-bold text-secondary fs-5"></Form.Label>
//         <p className="text-secondary fw-bold upload-paragraph">
//           *Supported: High Resolution PDFs files (.pdf). Recommended to place air conditioner (rectangle) above door in drawing.
//         </p>
//         <p className="text-secondary fw-bold upload-paragraph">
//           * PDFs files (.pdf) should be flat/apartment drawing and without any modifications.
//         </p>
//         <p className="text-secondary fw-bold upload-paragraph">
//           *Add rectangle: <kbd>Click On Empty Area</kbd>
//         </p>
//         <p className="text-secondary fw-bold upload-paragraph">
//           *Enter to appeared prompt window relevant to air conditioner comment.
//         </p>
//         <p className="text-secondary fw-bold upload-paragraph">
//           *Rotate rectangle: <kbd>Click</kbd>
//         </p>
//         <p className="text-secondary fw-bold upload-paragraph">
//           *Delete rectangle for small screens: <kbd>Tap And Hold</kbd>
//         </p>
//         <p className="text-secondary fw-bold upload-paragraph">
//           *Delete rectangle for large screens: <kbd>Right Click</kbd>
//         </p>
//         <p className="text-secondary fw-bold upload-paragraph">
//           *For saving approved drawing: <kbd>Click on the button "Save PDF File"</kbd>
//         </p>
//         <p className="text-secondary fw-bold upload-paragraph">
//           *To remove unnecessary drawing, simply click the <kbd>Clear</kbd> button.
//         </p>

//         <Form.Control
//           className="mt-4 form-control"
//           id="file-upload"
//           type="file"
//           multiple
//           ref={fileInputRef}
//           onChange={handleChange}
//           accept="application/pdf"
//           disabled={!scriptsLoaded || loading}
//         />
//       </Form>

//       <h2 className="mt-4 mb-4 text-secondary">Preview of selected file:</h2>

//       {(loading || !scriptsLoaded) && (
//         <div className="d-flex align-items-center justify-content-center text-primary my-3">
//           <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
//           {scriptsLoaded ? "Processing..." : "Loading libraries..."}
//         </div>
//       )}

//       {scriptsLoaded &&
//         results?.map((result, i) => (
//           <div key={i} className="mt-4 p-4 bg-white rounded shadow-sm border">
//             <h5 className="mb-3">File Name: {result.fileName}</h5>

//             {result.error ? (
//               <div className="text-danger fw-semibold">Error: {result.error}</div>
//             ) : (
//               <>
//                 {result.apartmentType && (
//                   <p className="mt-3 fw-semibold">
//                     Apartment Type: <span className="text-primary">{result.apartmentType}</span>
//                   </p>
//                 )}

//                 <h6 className="fw-semibold mt-4 mb-3">Classified Room Data Table</h6>

//                 <div className="mb-3 d-flex gap-3 align-items-center">
//                   <input
//                     type="text"
//                     placeholder="Filter by room type"
//                     value={filterText}
//                     onChange={(e) => setFilterText(e.target.value)}
//                     className="form-control w-auto"
//                   />
//                   <select
//                     value={sortKey}
//                     onChange={(e) => setSortKey(e.target.value)}
//                     className="form-select w-auto"
//                   >
//                     <option value="roomType">Room Type</option>
//                     <option value="width">Width</option>
//                     <option value="height">Height</option>
//                     <option value="areaSqft">Area (sqft)</option>
//                     <option value="areaSqm">Area (sqm)</option>
//                   </select>
//                   <Button
//                     variant="light"
//                     className="go-to-btn btn-text"
//                     onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
//                     title="Toggle sort order"
//                   >
//                     Sort: {sortOrder === "asc" ? "ASC" : "DESC"}
//                   </Button>
//                   <Button
//                     variant="light"
//                     className="go-to-btn btn-text"
//                     onClick={() => handleExportExcelStyled(filteredRooms, pdfInfo)}
//                   >
//                     Export Excel
//                   </Button>
//                   <Button
//                     variant="light"
//                     className="go-to-btn btn-text"
//                     onClick={() => setShowRoomOverlays((prev) => !prev)}
//                   >
//                     {showRoomOverlays ? "Hide Room Overlays" : "Show Room Overlays"}
//                   </Button>
//                 </div>

//                 {filteredRooms.length ? (
//                   <div className="table-responsive rounded border shadow-sm">
//                     <table className="table table-striped mb-0">
//                       <thead className="table-light">
//                         <tr>
//                           <th>#</th>
//                           <th>Room Type</th>
//                           <th>Width</th>
//                           <th>Height</th>
//                           <th>Area (sqft)</th>
//                           <th>Area (sqm)</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {filteredRooms.map((room, idx) => (
//                           <tr key={idx}>
//                             <td>{idx + 1}</td>
//                             <td>{room.roomType || "Unknown"}</td>
//                             <td>{room.width}</td>
//                             <td>{room.height}</td>
//                             <td>{room.areaSqFt}</td>
//                             <td>{room.areaSqM}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 ) : (
//                   <p className="fst-italic text-secondary">No classified room data found.</p>
//                 )}
//               </>
//             )}
//           </div>
//         ))}

//       {previewUrl && (
//         <div className="text-center">
//           <div style={{ position: "relative", display: "inline-block" }} className="container-main">
//             <canvas
//               id="my-canvas"
//               ref={canvasRef}
//               style={{ border: "1px solid black" }}
//               width={pdfSize.width}
//               height={pdfSize.height}
//               onClick={handleCanvasEvent}
//             />
//             <Stage
//               ref={stageRef}
//               width={pdfSize.width}
//               height={pdfSize.height}
//               onClick={handleStageClick}
//               onContextMenu={handleRectangleRightClick}
//               style={{ position: "absolute", top: 0, left: 0 }}
//             >
//               <Layer>
//                 {lines.map((line) => (
//                   <Line key={line.id} points={line.points} stroke={line.stroke} strokeWidth={line.strokeWidth} />
//                 ))}
//               </Layer>

//               <Layer>
//                 {rectangles.map((rect) => (
//                   <Rect
//                     key={rect.id}
//                     id={rect.id}
//                     name="rect"
//                     x={rect.x}
//                     y={rect.y}
//                     width={rect.width}
//                     height={rect.height}
//                     fill={rect.fill}
//                     draggable={true}
//                     rotation={rect.rotation}
//                     onContextMenu={(event) => {
//                       event.evt.preventDefault();
//                       event.cancelBubble = true;
//                       const clickedRectId = event.target.attrs.id;
//                       setRectangles((prev) => prev.filter((r) => r.id !== clickedRectId));
//                     }}
//                     onDragMove={handleDragMove}
//                     onDragEnd={handleDragEnd}
//                     onClick={(event) => {
//                       event.cancelBubble = true;
//                       const clickedRectId = event.target.attrs.id;
//                       rotateRectangle(clickedRectId);
//                     }}
//                     onTouchStart={handleTouchStart}
//                   />
//                 ))}
//               </Layer>

//               <Layer>
//                 {comments.map((comment) => (
//                   <Text
//                     key={comment.id}
//                     id={comment.id}
//                     x={comment.x}
//                     y={comment.y}
//                     text={""}
//                     fill={comment.fill}
//                     draggable={true}
//                     onDragMove={handleDragMove}
//                     onDragEnd={handleDragEnd}
//                   />
//                 ))}
//               </Layer>

//               {/* Room type colored rectangles */}
//               <Layer>
//                 {showRoomOverlays &&
//                   roomColorRectangles.map((rect) => (
//                     <Rect
//                       key={rect.id}
//                       x={rect.x}
//                       y={rect.y}
//                       width={rect.width}
//                       height={rect.height}
//                       fill={rect.fill}
//                       opacity={rect.opacity || 0.4}
//                       stroke={rect.stroke}
//                       strokeWidth={rect.strokeWidth}
//                       listening={false}
//                     />
//                   ))}
//               </Layer>
//             </Stage>
//           </div>

//           <div className="d-flex">
//             {file && file.type === "application/pdf" && (
//               <>
//                 <Button
//                   variant="btn-outline"
//                   onClick={saveToBackend}
//                   disabled={isSaving}
//                   className="mt-2 me-2 go-to-btn btn-text mb-3"
//                 >
//                   {isSaving ? "Saving..." : "Save PDF File"}
//                 </Button>
//                 <Button variant="btn-outline" className="mt-2 mb-3 go-to-btn btn-text" onClick={clearCanvas}>
//                   Clear
//                 </Button>
//               </>
//             )}
//           </div>

//           {error && <p className="error-message mt-4">{error}</p>}
//         </div>
//       )}
//     </div>
//   );
// };

// export default Annotator1;
