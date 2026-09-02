// Hand-written to match supabase/migrations/*.sql. Once the project has a
// Supabase CLI link set up, replace this with the generated file:
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
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      contact_preferences: {
        Row: {
          owner_id: string;
          contact_id: string;
          nickname: string | null;
          color_key: 'slate' | 'blue' | 'violet' | 'rose' | 'orange' | 'green' | 'cyan' | 'pink';
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          contact_id: string;
          nickname?: string | null;
          color_key?: 'slate' | 'blue' | 'violet' | 'rose' | 'orange' | 'green' | 'cyan' | 'pink';
        };
        Update: Partial<{
          nickname: string | null;
          color_key: 'slate' | 'blue' | 'violet' | 'rose' | 'orange' | 'green' | 'cyan' | 'pink';
        }>;
        Relationships: [
          {
            foreignKeyName: 'contact_preferences_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_preferences_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          due_on: string;
          completed: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          due_on: string;
          completed?: boolean;
          position?: number;
        };
        Update: Partial<{
          title: string;
          due_on: string;
          completed: boolean;
          position: number;
        }>;
        Relationships: [
          {
            foreignKeyName: 'todos_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'user_blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'connections_user_a_fkey';
            columns: ['user_a'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'connections_user_b_fkey';
            columns: ['user_b'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'connection_requests_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'connection_requests_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: never; // created only via create_group RPC
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'groups_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: never; // created only via create_group / add_group_member RPCs
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          type: 'direct' | 'group';
          group_id: string | null;
          direct_key: string | null;
          created_at: string;
          last_message_at: string;
        };
        Insert: never; // created only via RPCs
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'conversations_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: true;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string | null;
        };
        Insert: never;
        Update: Partial<{ last_read_at: string | null }>;
        Relationships: [
          {
            foreignKeyName: 'conversation_participants_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          edited_at: string | null;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          body: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          group_id: string;
          created_by: string;
          name: string;
          notes: string | null;
          response_type: 'rsvp' | 'select_option';
          repeat_rule: 'never' | 'daily' | 'weekly' | 'custom';
          starts_on: string;
          repeat_until: string | null;
          created_at: string;
        };
        Insert: never; // created only via create_plan RPC
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'plans_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plans_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_options: {
        Row: { id: string; plan_id: string; label: string; sort_order: number };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'plan_options_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_instances: {
        Row: { id: string; plan_id: string; occurs_on: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'plan_instances_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_responses: {
        Row: {
          id: string;
          plan_instance_id: string;
          user_id: string;
          option_id: string | null;
          rsvp_status: 'yes' | 'no' | 'maybe' | null;
          responded_at: string;
        };
        Insert: never; // created only via submit_plan_response RPC
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'plan_responses_plan_instance_id_fkey';
            columns: ['plan_instance_id'];
            isOneToOne: false;
            referencedRelation: 'plan_instances';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_responses_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_responses_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'plan_options';
            referencedColumns: ['id'];
          },
        ];
      };
      google_integrations: {
        Row: {
          id: string;
          user_id: string;
          service: 'calendar' | 'gmail';
          refresh_token: string;
          access_token: string | null;
          access_token_expires_at: string | null;
          granted_scope: string;
          connected_at: string;
        };
        Insert: {
          user_id: string;
          service: 'calendar' | 'gmail';
          refresh_token: string;
          access_token?: string | null;
          access_token_expires_at?: string | null;
          granted_scope: string;
        };
        Update: Partial<{
          refresh_token: string;
          access_token: string | null;
          access_token_expires_at: string | null;
          granted_scope: string;
        }>;
        Relationships: [
          {
            foreignKeyName: 'google_integrations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          link: string | null;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          link?: string | null;
        };
        Update: Partial<{ read_at: string | null }>;
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      send_connection_request: {
        Args: { p_recipient_id: string };
        Returns: void;
      };
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
      decline_connection_request: {
        Args: { p_request_id: string };
        Returns: void;
      };
      cancel_connection_request: {
        Args: { p_request_id: string };
        Returns: void;
      };
      block_user: {
        Args: { p_blocked_id: string };
        Returns: void;
      };
      unblock_user: {
        Args: { p_blocked_id: string };
        Returns: void;
      };
      get_or_create_direct_conversation: {
        Args: { p_other_user_id: string };
        Returns: string;
      };
      create_group: {
        Args: { p_name: string; p_member_ids: string[] };
        Returns: string;
      };
      add_group_member: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: void;
      };
      leave_group: {
        Args: { p_group_id: string };
        Returns: void;
      };
      create_plan: {
        Args: {
          p_group_id: string;
          p_name: string;
          p_notes: string | null;
          p_response_type: 'rsvp' | 'select_option';
          p_options: string[] | null;
          p_repeat_rule: 'never' | 'daily' | 'weekly' | 'custom';
          p_starts_on: string;
          p_repeat_until: string | null;
          p_custom_dates: string[] | null;
        };
        Returns: string;
      };
      submit_plan_response: {
        Args: { p_instance_id: string; p_option_id: string | null; p_rsvp_status: string | null };
        Returns: void;
      };
      delete_plan: {
        Args: { p_plan_id: string };
        Returns: void;
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ConnectionRequest = Database['public']['Tables']['connection_requests']['Row'];
export type PublicProfilePreview = Database['public']['Functions']['find_by_relay_number']['Returns'][number];
export type Group = Database['public']['Tables']['groups']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Todo = Database['public']['Tables']['todos']['Row'];

export type PlanResponseType = 'rsvp' | 'select_option';
export type PlanRepeatRule = 'never' | 'daily' | 'weekly' | 'custom';
export type RsvpStatus = 'yes' | 'no' | 'maybe';

export interface Plan {
  id: string;
  group_id: string;
  created_by: string;
  name: string;
  notes: string | null;
  response_type: PlanResponseType;
  repeat_rule: PlanRepeatRule;
  starts_on: string;
  repeat_until: string | null;
  created_at: string;
}

export interface PlanOption {
  id: string;
  plan_id: string;
  label: string;
  sort_order: number;
}

export interface PlanInstance {
  id: string;
  plan_id: string;
  occurs_on: string;
  created_at: string;
}

export interface PlanResponse {
  id: string;
  plan_instance_id: string;
  user_id: string;
  option_id: string | null;
  rsvp_status: RsvpStatus | null;
  responded_at: string;
}

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'group_added'
  | 'new_message'
  | 'plan_created'
  | 'plan_reminder';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
}
