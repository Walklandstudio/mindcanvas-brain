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
          slug: string | null;
          created_at: string | null;
          owner_user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          owner_user_id?: string | null;
        };
        Update: {
          name?: string;
          slug?: string | null;
          owner_user_id?: string | null;
        };
        Relationships: [];
      };

      frameworks: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          version: string | null;
          created_at: string | null;
          owner_id: string | null;
          frequency_meta: Json | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          version?: string | null;
          owner_id?: string | null;
          frequency_meta?: Json | null;
        };
        Update: {
          name?: string;
          version?: string | null;
          owner_id?: string | null;
          frequency_meta?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "frameworks_org_id_fkey";
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
