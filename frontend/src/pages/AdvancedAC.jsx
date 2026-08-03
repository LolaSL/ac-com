import React from "react";
import Image from "react-bootstrap/Image";
import { Link } from "react-router-dom";
import { FaSnowflake } from "react-icons/fa";
import { useTranslation, Trans } from "react-i18next";
import "./AdvancedAC.css";

const AdvancedAC = () => {
  const { t } = useTranslation();
  const checklistItems = t("advancedAc.checklist.items", { returnObjects: true });
  const costRows = t("advancedAc.costPayback.table.rows", { returnObjects: true });

  return (
    <div className="advanced-ac-page">
      {/* Hero Banner */}
      <section className="aac-hero">
        <div className="aac-hero__inner">
          <FaSnowflake className="aac-hero__icon" />
          <h1 className="aac-hero__title">{t("advancedAc.hero.title")}</h1>
          <p className="aac-hero__sub">{t("advancedAc.hero.subtitle")}</p>
        </div>
      </section>

      {/* Content Wrapper */}
      <div className="aac-content">
<article>     <p className="mb-3 p-3 ac-conditioning fs-5">
            {t("advancedAc.intro")}
          </p></article>
            <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">
          {t("advancedAc.heatPumps.title")}
        </h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          {t("advancedAc.heatPumps.text")}
          </p>
      </article>
      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">
          {t("advancedAc.heatRecovery.title")}
        </h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          {t("advancedAc.heatRecovery.p1")}
        </p>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          {t("advancedAc.heatRecovery.p2")}
        </p>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          <Trans i18nKey="advancedAc.heatRecovery.p3" components={{ strong: <strong /> }} />
        </p>
        <div className="mb-4 text-center pb-4">
          <Image
            src="/images/ac5.jpg"
            alt="Heat Recovery Ventilation System"
            className="responsive-image-advanced rounded"
          />
        </div>
      </article>
        <article>
         
        <h3 className="mb-2 p-4 fs-3 text-bold">
          {t("advancedAc.energyEfficiency.title")}
        </h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          {t("advancedAc.energyEfficiency.text")}
          </p>
             <h3 className="mb-2 p-4 fs-3 text-bold">{t("advancedAc.energyEfficiency.samsungTitle")}</h3>
          <p className="mb-3 p-3 ac-conditioning fs-4"><Trans i18nKey="advancedAc.energyEfficiency.samsungText" components={{ strong: <strong /> }} /></p>
        
          <div className="mb-4 text-center pb-4">
          <Image
            src="/images/ac.jpg"
            alt="Air Conditioning"
            className="responsive-image-advanced rounded"
          />
        </div>
      </article>
  
      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">
          {t("advancedAc.indoorAirQuality.title")}
        </h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          {t("advancedAc.indoorAirQuality.p1")}
        </p>
        <div className="mb-4 text-center">
          <Image
            src="/images/ac3.jpg"
            alt="Air Conditioning team"
            className="responsive-image-advanced rounded"
          />
          </div>
          <p className="mb-3 p-3 ac-conditioning fs-4">
          <Trans i18nKey="advancedAc.indoorAirQuality.daikinText" components={{ strong: <strong /> }} />
          </p>
        <div className="mb-4 text-center">
          <Image
            src="/images/ac4.jpg"
            alt="Air Conditioning Purifier"
            className="responsive-image-advanced rounded"
          />
        </div>
      </article>
      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">{t("advancedAc.whyUpgrade.title")}</h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          {t("advancedAc.whyUpgrade.text")}
          </p>
      </article>

      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">{t("advancedAc.costPayback.title")}</h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          {t("advancedAc.costPayback.intro")}
        </p>
        <div className="p-3">
          <div className="table-responsive">
            <table className="table table-striped table-bordered align-middle">
              <thead>
                <tr>
                  <th>{t("advancedAc.costPayback.table.headers.propertyType")}</th>
                  <th>{t("advancedAc.costPayback.table.headers.installedCost")}</th>
                  <th>{t("advancedAc.costPayback.table.headers.annualSavings")}</th>
                  <th>{t("advancedAc.costPayback.table.headers.payback")}</th>
                </tr>
              </thead>
              <tbody>
                {costRows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.type}</td>
                    <td>{row.cost}</td>
                    <td>{row.savings}</td>
                    <td>{row.payback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mb-3 p-3 ac-conditioning fs-6">
          {t("advancedAc.costPayback.note")}
        </p>
      </article>

      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">{t("advancedAc.checklist.title")}</h3>
        <div className="mb-3 p-3 ac-conditioning fs-4">
          <ul className="mb-0">
            {checklistItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </article>

      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">{t("advancedAc.nextSteps.title")}</h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          {t("advancedAc.nextSteps.text")}
        </p>
        <div className="aac-next-actions d-flex flex-wrap justify-content-center gap-3">
          <Link to="/measurement" className="aac-action-btn aac-action-btn--measurement">{t("advancedAc.nextSteps.startMeasurement")}</Link>
          {/* <Link to="/roi-calculator" className="aac-action-btn aac-action-btn--roi">Estimate ROI</Link> */}
          <Link to="/search" className="aac-action-btn aac-action-btn--browse">{t("advancedAc.nextSteps.browseProducts")}</Link>
          <Link to="/contact" className="aac-action-btn aac-action-btn--contact">{t("advancedAc.nextSteps.bookExpertHelp")}</Link>
        </div>
      </article>

      <div className="mt-4 mb-4 text-center">
        <Link to="/" className="home-btn btn btn-primary">
          🏠 {t("auth.home")}
        </Link>
      </div>
      </div>
    </div>
  );
};

export default AdvancedAC;

