import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Button, Tabs, Tab } from "react-bootstrap";
import "./ModalLegend_new.css";

// Renders a translated string that may contain inline HTML formatting
// (<strong>, <em>, nested <ul>/<li>) produced by translators in the locale
// JSON files. Content originates only from our own static locale files
// (never from user input), so dangerouslySetInnerHTML is safe here.
const HtmlLi = ({ html }) => <li dangerouslySetInnerHTML={{ __html: html }} />;

const HtmlList = ({ items, className = "list-disc ml-4 space-y-1 fs-6" }) => (
  <ul className={className}>
    {items.map((html, i) => (
      <HtmlLi key={i} html={html} />
    ))}
  </ul>
);

const ModalLegend = () => {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const printRef = useRef(null);

  const handleShow = () => {
    setShow(true);
  };

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t("measurement.legend.printDocTitle")}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 24px; }
            h5 { color: #0d6efd; margin-top: 18px; margin-bottom: 6px; }
            h6 { color: #0d6efd; margin-top: 14px; margin-bottom: 4px; font-size: 13px; }
            ul { margin: 0 0 8px 18px; padding: 0; }
            li { margin-bottom: 4px; line-height: 1.5; }
            strong { color: #111; }
            .section { border-top: 1px solid #dee2e6; margin-top: 20px; padding-top: 12px; }
            .footer { margin-top: 24px; font-size: 11px; color: #6c757d; border-top: 1px solid #dee2e6; padding-top: 8px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h3 style="color:#dc3545">${t("measurement.legend.printHeading")}</h3>
          <p style="color:#6c757d;font-size:12px">${t("measurement.legend.printGenerated", { date: new Date().toLocaleString() })}</p>
          ${content.innerHTML}
          <div class="footer">${t("measurement.legend.printFooter")}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }, [t]);

  // DOM-based search: runs after every render, filters <li> items and highlights matches
  useEffect(() => {
    const container = printRef.current;
    if (!container) return;
    const q = searchQuery.trim().toLowerCase();

    // Restore all items first
    container.querySelectorAll('li').forEach((li) => {
      li.style.display = '';
      if (li.dataset.originalHtml !== undefined) {
        li.innerHTML = li.dataset.originalHtml;
        delete li.dataset.originalHtml;
      }
    });

    if (!q) {
      // Show all section headers and paragraphs too
      container.querySelectorAll('h6, p').forEach((el) => (el.style.display = ''));
      return;
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');

    container.querySelectorAll('li').forEach((li) => {
      const text = li.textContent.toLowerCase();
      if (!text.includes(q)) {
        li.style.display = 'none';
      } else {
        // Highlight match inside the li
        if (li.dataset.originalHtml === undefined) {
          li.dataset.originalHtml = li.innerHTML;
        }
        li.innerHTML = li.dataset.originalHtml.replace(
          regex,
          '<mark style="background:#fef08a;padding:0">$1</mark>'
        );
      }
    });

    // Hide section headings whose entire list has no visible items
    container.querySelectorAll('h6').forEach((h6) => {
      let next = h6.nextElementSibling;
      let hasVisible = false;
      while (next && next.tagName !== 'H6') {
        if (next.tagName === 'UL') {
          const anyVisible = Array.from(next.querySelectorAll('li')).some(
            (li) => li.style.display !== 'none'
          );
          if (anyVisible) hasVisible = true;
        }
        next = next.nextElementSibling;
      }
      h6.style.display = hasVisible ? '' : 'none';
    });
  }, [searchQuery]);

  return (
    <>
      <button className="phv-trigger" onClick={handleShow}>
        {t("measurement.legend.trigger")}
      </button>
      <Modal
        show={show}
        onHide={() => setShow(false)}
        centered
        size="lg"
        fullscreen="sm"
        className="modal-legend"
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-danger text-bold">
            {t("measurement.legend.title")}
          </Modal.Title>
        </Modal.Header>

        {/* Search + Print bar — outside Modal.Body so sticky works reliably */}
        <div className="legend-search-bar">
          <input
            type="text"
            className="form-control form-control-sm legend-search-input"
            placeholder={t("measurement.legend.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="btn btn-outline-secondary btn-sm legend-search-clear"
              onClick={() => setSearchQuery('')}
              title={t("measurement.legend.clearSearchTitle")}
            >✕</button>
          )}
          <button
            className="btn btn-outline-primary btn-sm legend-print-btn"
            onClick={handlePrint}
            title={t("measurement.legend.printBtnTitle")}
          >{t("measurement.legend.printBtn")}</button>
        </div>

        <Modal.Body>
          {/* Printable content ref */}
          <div ref={printRef}>
          <Tabs defaultActiveKey="annotator" id="legend-tabs" className="mb-3">
            {/* BUTTON LEGEND TAB */}
            <Tab eventKey="buttons" title={t("measurement.legend.tabs.buttons")}>
              <div className="mt-3">
                <h6 className="mb-2 text-primary">{t("measurement.legend.buttonsTab.designerHeading")}</h6>
                <HtmlList className="list-unstyled fs-6" items={t("measurement.legend.buttonsTab.designerItems", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.buttonsTab.roomTableHeading")}</h6>
                <HtmlList className="list-unstyled fs-6" items={t("measurement.legend.buttonsTab.roomTableItems", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.buttonsTab.btuHeading")}</h6>
                <HtmlList className="list-unstyled fs-6" items={t("measurement.legend.buttonsTab.btuItems", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-warning">{t("measurement.legend.buttonsTab.paramWarningHeading")}</h6>
                <p
                  className="fs-6 mb-2"
                  dangerouslySetInnerHTML={{ __html: t("measurement.legend.buttonsTab.paramWarningText") }}
                />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.buttonsTab.interactionHeading")}</h6>
                <HtmlList items={t("measurement.legend.buttonsTab.interactionItems", { returnObjects: true })} />
              </div>
            </Tab>

            {/* ANNOTATOR TAB */}
            <Tab eventKey="annotator" title={t("measurement.legend.tabs.annotator")}>
              <div className="mt-3">
                <h6 className="mb-2 text-primary">{t("measurement.legend.annotatorTab.step1Heading")}</h6>
                <HtmlList items={t("measurement.legend.annotatorTab.step1Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.annotatorTab.step2Heading")}</h6>
                <HtmlList items={t("measurement.legend.annotatorTab.step2Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.annotatorTab.step3Heading")}</h6>
                <HtmlList items={t("measurement.legend.annotatorTab.step3Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.annotatorTab.step4Heading")}</h6>
                <HtmlList items={t("measurement.legend.annotatorTab.step4Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.annotatorTab.step5Heading")}</h6>
                <HtmlList items={t("measurement.legend.annotatorTab.step5Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.annotatorTab.step6Heading")}</h6>
                <HtmlList items={t("measurement.legend.annotatorTab.step6Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.annotatorTab.step7Heading")}</h6>
                <HtmlList items={t("measurement.legend.annotatorTab.step7Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.annotatorTab.step8Heading")}</h6>
                <HtmlList items={t("measurement.legend.annotatorTab.step8Items", { returnObjects: true })} />
              </div>
            </Tab>

            {/* BTU CALCULATOR TAB */}
            <Tab eventKey="btu" title={t("measurement.legend.tabs.btu")}>
              <div className="mt-3">
                <h6 className="mb-2 text-primary">{t("measurement.legend.btuTab.step1Heading")}</h6>
                <HtmlList items={t("measurement.legend.btuTab.step1Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.btuTab.step2Heading")}</h6>
                <HtmlList items={t("measurement.legend.btuTab.step2Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.btuTab.step3Heading")}</h6>
                <HtmlList items={t("measurement.legend.btuTab.step3Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.btuTab.step4Heading")}</h6>
                <HtmlList items={t("measurement.legend.btuTab.step4Items", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.btuTab.multiFlatHeading")}</h6>
                <HtmlList items={t("measurement.legend.btuTab.multiFlatItems", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-primary">{t("measurement.legend.btuTab.understandingHeading")}</h6>
                <p className="text-gray-700 mb-3 fs-6">
                  {t("measurement.legend.btuTab.understandingIntro")}
                </p>
                <HtmlList items={t("measurement.legend.btuTab.understandingItems", { returnObjects: true })} />
                <p
                  className="fs-6 mt-3"
                  dangerouslySetInnerHTML={{ __html: t("measurement.legend.btuTab.importantNote") }}
                />
              </div>
            </Tab>

            {/* TIPS TAB */}
            <Tab eventKey="tips" title={t("measurement.legend.tabs.tips")}>
              <div className="mt-3">
                <h6 className="mb-2 text-success">{t("measurement.legend.tipsTab.accurateHeading")}</h6>
                <HtmlList items={t("measurement.legend.tipsTab.accurateItems", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-success">{t("measurement.legend.tipsTab.multiFlatHeading")}</h6>
                <HtmlList items={t("measurement.legend.tipsTab.multiFlatItems", { returnObjects: true })} />

                <h6 className="mb-2 mt-3 text-success">{t("measurement.legend.tipsTab.issuesHeading")}</h6>
                <HtmlList items={t("measurement.legend.tipsTab.issuesItems", { returnObjects: true })} />
              </div>
            </Tab>
          </Tabs>
          </div>{/* end printRef */}
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="btn btn-outline-primary btn-sm"
            onClick={handlePrint}
            title={t("measurement.legend.footer.printBtnTitle")}
          >
            {t("measurement.legend.footer.printBtn")}
          </Button>
          <Button
            className="go-to-btn btn-text w-auto"
            variant="btn-outline"
            size="sm"
            onClick={() => setShow(false)}
          >
            {t("measurement.legend.footer.closeBtn")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalLegend;
