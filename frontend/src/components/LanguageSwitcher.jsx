import React from "react";
import { useTranslation } from "react-i18next";
import NavDropdown from "react-bootstrap/NavDropdown";
import { SUPPORTED_LANGUAGES } from "../i18n/index.js";

const LANGUAGE_LABELS = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  he: "עברית",
  ru: "Русский",
};

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <NavDropdown
      title={`🌐 ${LANGUAGE_LABELS[i18n.resolvedLanguage] || t("language.label")}`}
      id="language-switcher"
      align="end"
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <NavDropdown.Item
          key={lng}
          active={i18n.resolvedLanguage === lng}
          onClick={() => changeLanguage(lng)}
        >
          {LANGUAGE_LABELS[lng]}
        </NavDropdown.Item>
      ))}
    </NavDropdown>
  );
}
