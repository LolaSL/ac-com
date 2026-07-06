import React from "react";

// Shared support-email link. On desktop (>768px) opens Gmail compose in a
// new tab; on small screens uses mailto: so the device's default mail app
// launches a compose window instead of the Gmail inbox.
const SUPPORT_EMAIL = "accomhomesupply.support@gmail.com";
const GMAIL_COMPOSE_URL =
  `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}` +
  `&su=Support%20Request`;

const SupportEmailLink = ({
  subject,
  label = SUPPORT_EMAIL,
  className,
  ...rest
}) => {
  const gmailHref = subject
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}` +
      `&su=${encodeURIComponent(subject)}`
    : GMAIL_COMPOSE_URL;
  const mailtoHref = subject
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${SUPPORT_EMAIL}`;

  const handleClick = (e) => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      e.preventDefault();
      window.location.href = mailtoHref;
    }
  };

  return (
    <a
      href={gmailHref}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
      {...rest}
    >
      {label}
    </a>
  );
};

export default SupportEmailLink;
export { SUPPORT_EMAIL };
