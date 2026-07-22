/**
 * supabase/migrations/0001_init.sql 스키마에 대응하는 손으로 작성한 타입입니다.
 *
 * 실제 프로젝트를 연결한 뒤에는 Supabase CLI로 이 파일을 자동 생성된 버전으로
 * 교체할 수 있습니다(package.json의 "gen:supabase-types" 스크립트 참고):
 *
 *   npx supabase gen types typescript --project-id <project-id> \
 *     > app/lib/supabase/database.types.ts
 */

export interface Database {
  public: {
    Tables: {
      complexes: {
        Row: {
          id: string;
          name: string;
          address: string;
          property_type: string | null;
          approval_date: string | null;
          total_households: number | null;
          buildings: number | null;
          parking_count: number | null;
          parking_per_household: number | null;
          heating: string | null;
          hallway_type: string | null;
          builder: string | null;
          nearby_schools: string[];
          subway: string | null;
          subway_distance: string | null;
          buses: string[];
          features: string[];
          molit_lawd_code: string | null;
          molit_apt_seq: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          address: string;
          property_type?: string | null;
          approval_date?: string | null;
          total_households?: number | null;
          buildings?: number | null;
          parking_count?: number | null;
          parking_per_household?: number | null;
          heating?: string | null;
          hallway_type?: string | null;
          builder?: string | null;
          nearby_schools?: string[];
          subway?: string | null;
          subway_distance?: string | null;
          buses?: string[];
          features?: string[];
          molit_lawd_code?: string | null;
          molit_apt_seq?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["complexes"]["Insert"]>;
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          complex_id: string;
          property_type: "아파트" | "오피스텔" | "상가" | "단독주택" | "기타";
          status: "draft" | "published";
          transaction_type: "매매" | "전세" | "월세";
          price: number;
          price_label: string;
          building: string;
          floor: number;
          total_floors: number;
          supply_area: number;
          exclusive_area: number;
          room_count: number;
          bathroom_count: number;
          direction: string;
          move_in_date: string;
          maintenance_fee: string | null;
          short_description: string;
          features: string[];
          naver_url: string | null;
          article_number: string | null;
          verified_date: string | null;
          is_featured: boolean;
          source_type: string | null;
          source_article_id: string | null;
          raw_source_text: string | null;
          unit_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          complex_id: string;
          property_type?: "아파트" | "오피스텔" | "상가" | "단독주택" | "기타";
          status?: "draft" | "published";
          transaction_type: "매매" | "전세" | "월세";
          price: number;
          price_label: string;
          building?: string;
          floor: number;
          total_floors: number;
          supply_area: number;
          exclusive_area: number;
          room_count: number;
          bathroom_count: number;
          direction: string;
          move_in_date: string;
          maintenance_fee?: string | null;
          short_description: string;
          features?: string[];
          naver_url?: string | null;
          article_number?: string | null;
          verified_date?: string | null;
          is_featured?: boolean;
          source_type?: string | null;
          source_article_id?: string | null;
          raw_source_text?: string | null;
          unit_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["listings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "listings_complex_id_fkey";
            columns: ["complex_id"];
            isOneToOne: false;
            referencedRelation: "complexes";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["listing_images"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      floor_plan_images: {
        Row: {
          id: string;
          complex_id: string;
          unit_type: string;
          exclusive_area: number | null;
          url: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          complex_id: string;
          unit_type: string;
          exclusive_area?: number | null;
          url: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["floor_plan_images"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "floor_plan_images_complex_id_fkey";
            columns: ["complex_id"];
            isOneToOne: false;
            referencedRelation: "complexes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type ComplexRow = Database["public"]["Tables"]["complexes"]["Row"];
export type ComplexInsert = Database["public"]["Tables"]["complexes"]["Insert"];
export type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
export type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
export type ListingImageRow =
  Database["public"]["Tables"]["listing_images"]["Row"];
export type ListingImageInsert =
  Database["public"]["Tables"]["listing_images"]["Insert"];
export type FloorPlanImageRow =
  Database["public"]["Tables"]["floor_plan_images"]["Row"];
export type FloorPlanImageInsert =
  Database["public"]["Tables"]["floor_plan_images"]["Insert"];
