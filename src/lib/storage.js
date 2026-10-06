// Pure Supabase Backend Adapter
// Legacy dummy storage removed — system operates via Supabase API

export const initialRoles = [
  { id: 'role-admin', name: 'Admin', description: 'Full administrative access and authority to finalize inventory and reports' },
  { id: 'role-inv-officer', name: 'Inventory Officer', description: 'Can perform physical inventory counting, barcode lookup, and draft reports' },
  { id: 'role-accountable', name: 'Accountable Officer', description: 'Can view assigned properties and acknowledge custody' },
  { id: 'role-viewer', name: 'Viewer', description: 'Read-only access to catalogs and reports' },
];

export const initialSignatoriesConfig = {
  // Certified Correct by (Inventory Committee)
  member1Name: 'ELMER G. DOLOTALLAS',
  member1Title: 'Member, NFSTI Inventory Committee / Supply Accountable Officer',
  member2Name: 'GLORIA C. PERIDO',
  member2Title: 'Member, NFSTI Inventory Committee / Budget Officer',
  member3Name: 'JENELYN N. EDEN',
  member3Title: 'Member, NFSTI Inventory Committee / Chief, GSS',
  certifiedCorrectByName: 'MA. CARLA G. FELIPE, RN',
  certifiedCorrectByTitle: 'Chairperson, NFSTI Inventory Committee / Chief, Admin',

  // Approved by (Director)
  approvedByName: 'ATTY. ERCY NANETTE P MADRIAGA, DPSSG',
  approvedByTitle: 'Director, NFSTI',

  // Verified by (State Auditor)
  verifiedByName: 'YVES ARDEN CABANLONG',
  verifiedByTitle: 'State Auditor IV/ Audit Team Leader, RO IV A',

  // Aliases for compatibility
  preparedByName: 'ELMER G. DOLOTALLAS',
  preparedByTitle: 'Supply Accountable Officer',
  teamLeaderName: 'GLORIA C. PERIDO',
  teamLeaderTitle: 'Budget Officer',
  member4Name: '',
  member4Title: '',
  member5Name: '',
  member5Title: '',
};

export const initialSettings = {
  orgName: 'National Fisheries Research and Development Institute',
  orgCode: 'NFSTI-MAIN',
  officeAddress: 'Corporate 101 Bldg., Mother Ignacia Ave., Quezon City, Metro Manila',
  contactEmail: 'property.supply@nfrdi.gov.ph',
  contactPhone: '(02) 8372-5000',
  defaultCurrency: 'PHP',
  currencySymbol: '₱',
  reportHeaderTitle: 'REPORT ON THE PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT',
  defaultUnit: 'unit',
};

const STORAGE_KEYS = {
  ACTIVE_USER: 'nfsti_active_user_v2',
  AUTHENTICATED: 'nfsti_authenticated',
};

// Audit Log Helper
export function recordAuditLog(action, entity, details, userName = 'Admin') {
  const now = new Date();
  const dateFormatted = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
    date: dateFormatted,
    user: userName,
    action,
    entity,
    details,
  };
}

const baseStorageManager = {
  // --- AUTH & ACTIVE USER ---
  getRoles: () => initialRoles,

  getActiveUser: () => {
    if (typeof window === 'undefined') {
      return {
        username: 'edolotallas',
        name: 'Elmer G. Dolotallas',
        fullName: 'Elmer G. Dolotallas',
        role: 'Admin',
        position: 'Supply Officer / Admin',
        initials: 'ED',
      };
    }
    try {
      const item = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER) || localStorage.getItem('nfsti_user_session');
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed) {
          if (!parsed.username) {
            if (parsed.name?.toLowerCase().includes('queenie') || parsed.fullName?.toLowerCase().includes('queenie')) {
              parsed.username = 'queenie_ppsc';
            } else {
              parsed.username = 'edolotallas';
            }
          }
          return parsed;
        }
      }
    } catch (e) {}
    return {
      username: 'edolotallas',
      name: 'Elmer G. Dolotallas',
      fullName: 'Elmer G. Dolotallas',
      role: 'Admin',
      position: 'Supply Officer / Admin',
      initials: 'ED',
    };
  },

  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTHENTICATED) === 'true';
    } catch (e) {
      return false;
    }
  },

  setAuthenticated: (isAuth, userObj = null) => {
    if (typeof window === 'undefined') return;
    try {
      if (isAuth) {
        localStorage.setItem(STORAGE_KEYS.AUTHENTICATED, 'true');
        if (userObj) {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(userObj));
        }
      } else {
        localStorage.removeItem(STORAGE_KEYS.AUTHENTICATED);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
      }
    } catch (e) {}
  },

  setActiveUser: (user) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    } catch (e) {}
  },

  // --- SETTINGS & SIGNATORIES ---
  getSignatoriesConfig: () => initialSignatoriesConfig,
  saveSignatoriesConfig: (config) => config,
  getSettings: () => initialSettings,
  saveSettings: (settingsData) => settingsData,

  generateOfficialReport: (reportPayload) => reportPayload,

  resetToDefaultSeed: () => {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  },
};

// Universal Proxy to safely catch and no-op ANY legacy StorageManager call
export const StorageManager = new Proxy(baseStorageManager, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    return (...args) => {
      if (String(prop).startsWith('get')) {
        return [];
      }
      return null;
    };
  },
});

/**
 * Universal authenticated & scoped fetch wrapper for client components
 */
export async function authFetch(url, options = {}) {
  let activeUser = null;
  if (typeof window !== 'undefined') {
    activeUser = StorageManager.getActiveUser();
  }
  const username = activeUser?.username || '';

  let finalUrl = url;
  if (username) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    if (!finalUrl.includes('username=') && !finalUrl.includes('user=')) {
      finalUrl = `${finalUrl}${separator}username=${encodeURIComponent(username)}`;
    }
  }

  const headers = {
    ...(options.headers || {}),
  };
  if (username) {
    headers['x-user-username'] = username;
  }

  return fetch(finalUrl, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });
}

