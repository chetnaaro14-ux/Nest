
export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'confirmed' | 'completed';
  cover_image: string | null;
  created_at: string;
}

export interface Day {
  id: string;
  trip_id: string;
  date: string;
  index: number;
}

export interface Activity {
  id: string;
  day_id: string;
  title: string;
  category: 'food' | 'sightseeing' | 'rest' | 'travel' | 'kids';
  start_time: string | null; // Format HH:mm:ss
  end_time: string | null;   // Format HH:mm:ss
  cost: number;
  notes: string | null;
  created_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
  // Joined profile data (optional for UI)
  profiles?: {
    email: string;
  };
}

export interface ActivityComment {
  id: string;
  activity_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  // Joined profile data
  profiles?: {
    email: string;
  };
}

export interface GeneratedActivitySuggestion {
  title: string;
  category: 'food' | 'sightseeing' | 'rest' | 'travel' | 'kids';
  approximate_start_time: string;
  approximate_end_time: string;
  cost: number;
  notes: string;
}

// Global interface for Veo API Key Selection
declare global {
  // Augment the existing AIStudio interface. 
  // We assume Window.aistudio is already defined as AIStudio.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}
