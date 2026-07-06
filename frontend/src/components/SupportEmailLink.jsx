import React, { useEffect, useState } from "react";

// Shared support-email link. On desktop (>768px) opens Gmail compose in a
// new tab; on small screens renders a plain mailto: so the device's default
// mail app launches its compose window (never the Gmail inbox).
const SUPPORT_EMAIL = "accomhomesupply.support@gmail.com";
const SMALL_SCREEN_MAX = 768;

const isSmallScreen = () =>
  typeof window !== "undefined" && window.innerWidth <= SMALL_SCREEN_MAX;

const SupportEmailLink = ({
  subject,
  label = SUPPORT_EMAIL,
  className,
  ...rest
}) => {
  const [small, setSmall] = useState(isSmallScreen);

  useEffect(() => {
    const onResize = () => setSmall(isSmallScreen());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const encodedSubject = encodeURIComponent(subject || "Support Request");

  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}`;
  const gmailHref =
    `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}` +
    `&su=${encodedSubject}`;

  if (small) {
    return (
      <a href={mailtoHref} className={className} {...rest}>
        {label}
      </a>
    );
  }

  return (
    <a
      href={gmailHref}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...rest}
    >
      {label}
    </a>
  );
};

export default SupportEmailLink;
export { SUPPORT_EMAIL };
