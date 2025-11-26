import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// MOCK IMPLEMENTATION
// ------------------------------------------------------------------
// This replaces the real Supabase client to allow the app to run
// without backend credentials.
// ------------------------------------------------------------------

console.log("%c NEST RUNNING IN MOCK MODE ", "background: #4f46e5; color: #fff; padding: 4px; border-radius: 4px;");

// --- Session Management ---

const STORAGE_KEY = 'nest_mock_session';
let currentSession: any = null;

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    currentSession = JSON.parse(stored);
  }
} catch (e) {
  // Ignore storage errors
}

const saveSession = (session: any) => {
  currentSession = session;
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const subscribers = new Set<any>();
const notifySubscribers = (event: string, session: any) => {
  subscribers.forEach(cb => cb(event, session));
};

// --- In-Memory Database ---

const MOCK_USER_ID = 'user-123-mock';
const MOCK_USER_EMAIL = 'demo@nest.app';

// Initial Mock Data
const db: any = {
  profiles: [{ id: MOCK_USER_ID, email: MOCK_USER_EMAIL, created_at: new Date().toISOString() }],
  trips: [],
  days: [],
  activities: [],
  trip_members: [],
  activity_comments: []
};

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockQueryBuilder {
  table: string;
  filters: any[];
  orders: any[];
  isSingle: boolean;
  isDelete: boolean;
  dataToInsert: any;
  dataToUpdate: any; // Add support for update
  selectedColumns: string;

  constructor(table: string) {
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.isSingle = false;
    this.isDelete = false;
    this.dataToInsert = null;
    this.dataToUpdate = null;
    this.selectedColumns = '*';
  }

  select(columns = '*') {
    this.selectedColumns = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: 'in', column, values });
    return this;
  }

  order(column: string, { ascending = true }: any = {}) {
    this.orders.push({ column, ascending });
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(data: any) {
    this.dataToInsert = data;
    return this;
  }

  update(data: any) {
    this.dataToUpdate = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  // The 'then' method makes this awaitable
  async then(resolve: any, reject: any) {
    await delay(300); // Simulate network

    try {
      let resultData: any = null;
      let error: any = null;

      // HANDLE INSERT
      if (this.dataToInsert) {
        const rows = Array.isArray(this.dataToInsert) ? this.dataToInsert : [this.dataToInsert];
        const newRows = rows.map((r: any) => ({
          ...r,
          id: r.id || crypto.randomUUID(),
          created_at: new Date().toISOString()
        }));
        
        if (!db[this.table]) db[this.table] = [];
        db[this.table] = [...db[this.table], ...newRows];
        
        // Return created data
        resultData = this.isSingle ? newRows[0] : newRows;
        resolve({ data: resultData, error: null });
        return;
      }

      // HANDLE UPDATE
      if (this.dataToUpdate) {
        let rows = db[this.table] || [];
        // Find rows to update based on filters
        let updatedCount = 0;
        
        db[this.table] = rows.map((r: any) => {
          let match = true;
          for (const f of this.filters) {
            if (f.type === 'eq' && r[f.column] !== f.value) match = false;
            if (f.type === 'in' && !f.values.includes(r[f.column])) match = false;
          }
          
          if (match) {
            updatedCount++;
            return { ...r, ...this.dataToUpdate };
          }
          return r;
        });

        if (this.isSingle) {
           // Find the updated row to return
           const updatedRow = db[this.table].find((r:any) => {
             for (const f of this.filters) {
                if (f.type === 'eq' && r[f.column] === f.value) return true;
             }
             return false;
           });
           resultData = updatedRow || null;
        } else {
           resultData = []; // simplified
        }
        
        resolve({ data: resultData, error: null });
        return;
      }

      // HANDLE DELETE
      if (this.isDelete) {
        let rows = db[this.table] || [];
        // Apply filters to find IDs to delete
        const idsToDelete = new Set();
        let rowsToDelete = rows;
        
        for (const f of this.filters) {
          if (f.type === 'eq') rowsToDelete = rowsToDelete.filter((r: any) => r[f.column] === f.value);
          if (f.type === 'in') rowsToDelete = rowsToDelete.filter((r: any) => f.values.includes(r[f.column]));
        }
        
        rowsToDelete.forEach((r: any) => idsToDelete.add(r.id));
        db[this.table] = rows.filter((r: any) => !idsToDelete.has(r.id));
        
        resolve({ data: null, error: null });
        return;
      }

      // HANDLE SELECT
      let rows = db[this.table] || [];

      // Apply Filters
      for (const f of this.filters) {
        if (f.type === 'eq') rows = rows.filter((r: any) => r[f.column] === f.value);
        if (f.type === 'in') rows = rows.filter((r: any) => f.values && f.values.includes(r[f.column]));
      }

      // Apply Sort
      for (const o of this.orders) {
        rows.sort((a: any, b: any) => {
          if (a[o.column] < b[o.column]) return o.ascending ? -1 : 1;
          if (a[o.column] > b[o.column]) return o.ascending ? 1 : -1;
          return 0;
        });
      }

      // Handle Joins (Rough approximation)
      if (this.selectedColumns.includes('profiles')) {
        rows = rows.map((r: any) => ({
          ...r,
          profiles: db.profiles.find((p: any) => p.id === r.user_id) || { email: 'unknown' }
        }));
      }

      if (this.isSingle) {
        if (rows.length === 0) {
          // Supabase specific error code for no rows
          error = { code: 'PGRST116', message: 'Row not found' };
          resultData = null;
        } else {
          resultData = rows[0];
        }
      } else {
        resultData = rows;
      }

      resolve({ data: resultData, error });
    } catch (err) {
      reject(err);
    }
  }
}

// Mock Auth Client
const auth = {
  signUp: async ({ email, password }: any) => {
    await delay(500);
    // Create new user
    const newUser = { 
      id: crypto.randomUUID(), 
      email, 
      aud: 'authenticated', 
      role: 'authenticated', 
      created_at: new Date().toISOString() 
    };
    const session = {
      access_token: 'mock-token-' + newUser.id,
      token_type: 'bearer',
      user: newUser,
      expires_in: 3600,
      refresh_token: 'mock-refresh-' + newUser.id
    };
    
    // Auto login
    saveSession(session);
    notifySubscribers('SIGNED_IN', session);
    
    return { data: { user: newUser, session }, error: null };
  },

  signInWithPassword: async ({ email, password }: any) => {
    await delay(500);
    // In mock mode, we accept any password.
    // We try to find existing profile or create a mock one if it's the demo user
    let user = db.profiles.find((p: any) => p.email === email);
    
    if (!user) {
        // Just mock a user for this email so they can sign in
        user = {
            id: crypto.randomUUID(),
            email: email,
            created_at: new Date().toISOString()
        };
        // Add to profiles to "persist" them in memory
        db.profiles.push(user);
    }

    const sessionUser = {
        ...user,
        aud: 'authenticated',
        role: 'authenticated',
    };

    const session = {
      access_token: 'mock-token-' + user.id,
      token_type: 'bearer',
      user: sessionUser,
      expires_in: 3600,
      refresh_token: 'mock-refresh-' + user.id
    };

    saveSession(session);
    notifySubscribers('SIGNED_IN', session);
    return { data: { user: sessionUser, session }, error: null };
  },

  signInAnonymously: async () => {
    await delay(500);
    const guestUser = {
      id: 'guest-' + crypto.randomUUID(),
      email: 'guest@nest.app',
      aud: 'authenticated',
      role: 'anonymous',
      created_at: new Date().toISOString(),
      is_anonymous: true
    };
    
    const session = {
      access_token: 'guest-token-' + guestUser.id,
      token_type: 'bearer',
      user: guestUser,
      expires_in: 3600,
      refresh_token: 'guest-refresh-' + guestUser.id
    };

    saveSession(session);
    notifySubscribers('SIGNED_IN', session);
    return { data: { user: guestUser, session }, error: null };
  },

  signOut: async () => {
    await delay(200);
    saveSession(null);
    notifySubscribers('SIGNED_OUT', null);
    return { error: null };
  },

  getSession: async () => {
    return { data: { session: currentSession }, error: null };
  },

  getUser: async () => {
    return { data: { user: currentSession?.user || null }, error: null };
  },

  onAuthStateChange: (callback: any) => {
    subscribers.add(callback);
    // Fire immediately with current status
    callback(currentSession ? 'SIGNED_IN' : 'SIGNED_OUT', currentSession);
    return { data: { subscription: { unsubscribe: () => subscribers.delete(callback) } } };
  },

  resetPasswordForEmail: async () => {
    await delay(500);
    return { data: {}, error: null };
  },

  updateUser: async () => {
    await delay(500);
    return { data: {}, error: null };
  }
};

// Mock Storage
const storage = {
  from: (bucket: string) => ({
    upload: async (path: string, file: File) => {
      await delay(1000);
      return { data: { path }, error: null };
    },
    getPublicUrl: (path: string) => {
      // Return a random travel image to simulate a successful upload for the demo
      const images = [
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80", // Paris
        "https://images.unsplash.com/photo-1499856871940-a09627c6dcf6?auto=format&fit=crop&w=1200&q=80", // Switzerland
        "https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=1200&q=80", // Travel
        "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&q=80", // Venice
        "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80", // Cinque Terre
      ];
      // Pick based on path simple hash
      const index = path.length % images.length;
      return { data: { publicUrl: images[index] } };
    }
  })
};

export const supabase = {
  from: (table: string) => new MockQueryBuilder(table),
  auth,
  storage
} as any;