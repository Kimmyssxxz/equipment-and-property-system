// Pure Supabase Backend Adapter
// Legacy dummy storage removed — system operates via Supabase API

export const initialRoles = [
  { id: 'role-admin', name: 'Admin', description: 'Full administrative access and authority to finalize inventory and reports' },
  { id: 'role-inv-officer', name: 'Inventory Officer', description: 'Can perform physical inventory counting, barcode lookup, and draft reports' },
  { id: 'role-accountable', name: 'Accountable Officer', description: 'Can view assigned properties and acknowledge custody' },
  { id: 'role-viewer', name: 'Viewer', description: 'Read-only access to catalogs and reports' },
];

export const initialSignatoriesConfig = {
  preparedByName: '',
  preparedByTitle: 'Supply Section Representative',
  member1Name: '',
  member2Name: '',
  member3Name: '',
  member4Name: '',
  member5Name: '',
  certifiedCorrectByName: '',
  certifiedCorrectByTitle: 'Supply Accountable Officer / Chairperson',
  teamLeaderName: '',
  teamLeaderTitle: 'SDO',
  approvedByName: '',
  approvedByTitle: 'Director',
  verifiedByName: '',
  verifiedByTitle: 'State Auditor IV',
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
        name: 'Elmer G. Dolotallas',
        role: 'Admin',
        position: 'Supply Officer / Admin',
        initials: 'ED',
      };
    }
    try {
      const item = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      if (item) return JSON.parse(item);
    } catch (e) {}
    return {
      name: 'Elmer G. Dolotallas',
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
