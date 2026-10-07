// Tipos generados manualmente a partir de supabase/migrations/0001_init.sql.
// Cuando el proyecto Supabase exista, reemplazar con:
//   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts

export type MemberRole = "owner" | "admin" | "employee";
export type MemberStatus = "active" | "inactive";
export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_super_admin: boolean;
  created_at: string;
}

type BusinessRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  business_type: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  timezone: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

type BusinessMemberRow = {
  id: string;
  business_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
}

type EmployeeDetailsRow = {
  business_member_id: string;
  phone: string | null;
  specialty: string | null;
  photo_url: string | null;
  color_tag: string | null;
  commission_rate: number;
  can_create_bookings: boolean;
  access_code: string | null;
}

type ServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

type EmployeeServiceRow = {
  business_member_id: string;
  service_id: string;
}

type WorkScheduleRow = {
  id: string;
  business_member_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

type ClientRow = {
  id: string;
  business_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

type BookingRow = {
  id: string;
  business_id: string;
  client_id: string;
  service_id: string;
  business_member_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type EmployeePayoutRow = {
  id: string;
  business_id: string;
  business_member_id: string;
  amount: number;
  note: string | null;
  paid_at: string;
  created_by: string;
  created_at: string;
}

type NotificationRow = {
  id: string;
  business_id: string;
  business_member_id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "full_name" | "email">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      businesses: {
        Row: BusinessRow;
        Insert: Partial<BusinessRow> & Pick<BusinessRow, "owner_id" | "name" | "slug">;
        Update: Partial<BusinessRow>;
        Relationships: [];
      };
      business_members: {
        Row: BusinessMemberRow;
        Insert: Partial<BusinessMemberRow> & Pick<BusinessMemberRow, "business_id" | "user_id" | "role">;
        Update: Partial<BusinessMemberRow>;
        Relationships: [];
      };
      employee_details: {
        Row: EmployeeDetailsRow;
        Insert: Partial<EmployeeDetailsRow> & Pick<EmployeeDetailsRow, "business_member_id">;
        Update: Partial<EmployeeDetailsRow>;
        Relationships: [];
      };
      services: {
        Row: ServiceRow;
        Insert: Partial<ServiceRow> & Pick<ServiceRow, "business_id" | "name" | "duration_minutes">;
        Update: Partial<ServiceRow>;
        Relationships: [];
      };
      employee_services: {
        Row: EmployeeServiceRow;
        Insert: EmployeeServiceRow;
        Update: Partial<EmployeeServiceRow>;
        Relationships: [];
      };
      work_schedules: {
        Row: WorkScheduleRow;
        Insert: Partial<WorkScheduleRow> & Pick<WorkScheduleRow, "business_member_id" | "weekday" | "start_time" | "end_time">;
        Update: Partial<WorkScheduleRow>;
        Relationships: [];
      };
      clients: {
        Row: ClientRow;
        Insert: Partial<ClientRow> & Pick<ClientRow, "business_id" | "first_name">;
        Update: Partial<ClientRow>;
        Relationships: [];
      };
      bookings: {
        Row: BookingRow;
        Insert: Partial<BookingRow> &
          Pick<BookingRow, "business_id" | "client_id" | "service_id" | "business_member_id" | "start_at" | "end_at">;
        Update: Partial<BookingRow>;
        Relationships: [];
      };
      employee_payouts: {
        Row: EmployeePayoutRow;
        Insert: Partial<EmployeePayoutRow> & Pick<EmployeePayoutRow, "business_id" | "business_member_id" | "amount">;
        Update: Partial<EmployeePayoutRow>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow> & Pick<NotificationRow, "business_id" | "business_member_id" | "title" | "body">;
        Update: Partial<NotificationRow>;
        Relationships: [];
      };
    };
    Views: {
      public_employees: {
        Row: {
          business_member_id: string;
          business_id: string;
          full_name: string;
          specialty: string | null;
          photo_url: string | null;
        };
        Relationships: [];
      };
      public_busy_slots: {
        Row: {
          business_member_id: string;
          start_at: string;
          end_at: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
