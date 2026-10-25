// Single source of truth for role handling on the frontend.
// Values mirror ROLES in the Express backend's source/config/constants.js.
// The backend is authoritative: these constants only let the UI describe and
// route what the server already decided.

export const ROLES = {
  PASSENGER: 'PASSENGER',
  OFFICER: 'OFFICER',
  SENIOR_AUTHORITY: 'SENIOR_AUTHORITY',
  ADMIN: 'ADMIN',
};

export const ROLE_VALUES = Object.values(ROLES);

/** Normalises whatever the server sent into a canonical uppercase role. */
export const normalizeRole = (role) => {
  if (!role) return null;
  const upper = String(role).toUpperCase();
  return ROLE_VALUES.includes(upper) ? upper : null;
};

/** Landing route for each authenticated role. */
export const homeRouteForRole = (role) => {
  switch (normalizeRole(role)) {
    case ROLES.ADMIN:
      return '/admin';
    case ROLES.SENIOR_AUTHORITY:
      return '/authority';
    case ROLES.OFFICER:
      return '/officer';
    case ROLES.PASSENGER:
      return '/passenger';
    default:
      return '/';
  }
};

/** Translation key for a role's display name. */
export const roleLabelKey = (role) => {
  switch (normalizeRole(role)) {
    case ROLES.ADMIN:
      return 'roleAdmin';
    case ROLES.SENIOR_AUTHORITY:
      return 'roleSeniorAuthority';
    case ROLES.OFFICER:
      return 'roleOfficer';
    case ROLES.PASSENGER:
      return 'rolePassenger';
    default:
      return 'roleUnknown';
  }
};

export const isPassenger = (role) => normalizeRole(role) === ROLES.PASSENGER;
export const isOfficer = (role) => normalizeRole(role) === ROLES.OFFICER;
export const isSeniorAuthority = (role) => normalizeRole(role) === ROLES.SENIOR_AUTHORITY;
export const isAdmin = (role) => normalizeRole(role) === ROLES.ADMIN;

/** Anyone who works complaints rather than filing them. */
export const isStaff = (role) => {
  const r = normalizeRole(role);
  return r === ROLES.OFFICER || r === ROLES.SENIOR_AUTHORITY || r === ROLES.ADMIN;
};
