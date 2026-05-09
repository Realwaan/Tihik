const ADMIN_EMAILS = ["andreiregulacion996@gmail.com"];

export function getAdminEmails() {
  return ADMIN_EMAILS;
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const allowedEmails = getAdminEmails();

  if (allowedEmails.length === 0) {
    return false;
  }

  return allowedEmails.includes(email.trim().toLowerCase());
}