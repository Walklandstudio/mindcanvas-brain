export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
        };
        Update: {
          name?: string;
          logo_url?: string | null;
        };
        Relationships: [];
      };

      org_frameworks: {
        Row: {
          id: string;
          org_id: string; // FK → organizations.id
          name: string;
          slug: string;
          meta: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          slug: string;
          meta?: Json | null;
        };
        Update: {
          name?: string;
          slug?: string;
          meta?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "org_frameworks_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
