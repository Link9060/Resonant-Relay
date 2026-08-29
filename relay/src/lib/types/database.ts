// Hand-written to match supabase/schema.sql. Once the project has a Supabase
// CLI link set up, replace this with the generated file:
//   supabase gen types typescript --project-id <ref> > src/lib/types/database.ts

export type ConnectionRequestStatus = 'pending' | 'accepted' | 'declined' | 'canceled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          relay_number: string;
          school: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      connections: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          created_at: string;
        };
        Insert: never; // created only via accept_connection_request RPC
        Update: never;
      };
      connection_requests: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          status: ConnectionRequestStatus;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          sender_id: string;
          recipient_id: string;
        };
        Update: Partial<{
          status: ConnectionRequestStatus;
          responded_at: string | null;
        }>;
      };
    };
    Functions: {
      find_by_relay_number: {
        Args: { p_relay_number: string };
        Returns: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          school: string | null;
        }[];
      };
      accept_connection_request: {
        Args: { p_request_id: string };
        Returns: void;
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ConnectionRequest = Database['public']['Tables']['connection_requests']['Row'];
export type PublicProfilePreview = Database['public']['Functions']['find_by_relay_number']['Returns'][number];
