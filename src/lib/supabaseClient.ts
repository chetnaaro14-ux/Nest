import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// MOCK IMPLEMENTATION
// ------------------------------------------------------------------
// This replaces the real Supabase client to allow the app to run
// without backend credentials.
// ------------------------------------------------------------------

console.log("%c NEST RUNNING IN MOCK MODE ", "background: #4f46e5; color: #fff; padding: 4px; border-radius: 4px;");

const MOCK_USER_ID = 'user-123-mock';
const MOCK_USER_EMAIL = 'demo@nest.app';

// Mock Session
const mockSession = {
  access_token: 'mock-token',
  token_type: 'bearer',
  user: {
    id: MOCK_USER_ID,
    email: MOCK_USER_EMAIL,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
  },
  expires_in: 3600,
  refresh_token: 'mock-refresh-token'
};

// In-Memory Database
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
  selectedColumns: string;

  constructor(table: string) {
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.isSingle = false;
    this.isDelete = false;
    this.dataToInsert = null;
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
    // Mimic real behavior: if sign up, create user
    const newUser = { ...mockSession.user, email, id: crypto.randomUUID() };
    return { data: { user: newUser, session: { ...mockSession, user: newUser } }, error: null };
  },
  signInWithPassword: async ({ email, password }: any) => {
    await delay(500);
    return { data: { user: mockSession.user, session: mockSession }, error: null };
  },
  signOut: async () => {
    return { error: null };
  },
  getSession: async () => {
    return { data: { session: mockSession }, error: null };
  },
  getUser: async () => {
    return { data: { user: mockSession.user }, error: null };
  },
  onAuthStateChange: (callback: any) => {
    // Fire immediately to log user in
    setTimeout(() => callback('SIGNED_IN', mockSession), 100);
    return { data: { subscription: { unsubscribe: () => {} } } };
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

export const supabase = {
  from: (table: string) => new MockQueryBuilder(table),
  auth
} as any;