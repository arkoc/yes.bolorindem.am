import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Profiles ────────────────────────────────────────────────────────────────

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // FK to auth.users.id
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  totalPoints: integer("total_points").notNull().default(0),
  role: text("role").notNull().default("volunteer"), // volunteer | leader | admin
  referralCode: text("referral_code"),
  referredBy: uuid("referred_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  bannerUrl: text("banner_url"),
  status: text("status").notNull().default("draft"), // draft | active | completed | archived
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  completionBonusPoints: integer("completion_bonus_points").notNull().default(0),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasks = pgTable("tasks", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull().default("standard"), // standard | form | location
  completionPoints: integer("completion_points").notNull().default(10),
  maxCompletionsPerUser: integer("max_completions_per_user").default(1), // null = unlimited
  totalCompletionsAllowed: integer("total_completions_allowed"), // null = unlimited
  requiresEvidence: boolean("requires_evidence").notNull().default(false),
  formSchema: jsonb("form_schema"), // { fields: [...] }
  locationData: jsonb("location_data"), // { center, target_points, area_polygon }
  periodType: text("period_type"), // 'day' | 'week' | null
  periodLimit: integer("period_limit").default(1), // completions allowed per period
  allowBatchSubmission: boolean("allow_batch_submission").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Task Completions ─────────────────────────────────────────────────────────

export const taskCompletions = pgTable(
  "task_completions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    completionNumber: integer("completion_number").notNull().default(1),
    status: text("status").notNull().default("approved"), // approved | reversed
    formData: jsonb("form_data"),
    locationData: jsonb("location_data"),
    evidenceUrls: text("evidence_urls").array(),
    pointsAwarded: integer("points_awarded").notNull(),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reversedBy: uuid("reversed_by").references(() => profiles.id),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("task_completions_task_user_num_unique").on(
      table.taskId,
      table.userId,
      table.completionNumber
    ),
    index("task_completions_user_idx").on(table.userId),
    index("task_completions_task_idx").on(table.taskId),
  ]
);

// ─── Project Completions ──────────────────────────────────────────────────────

export const projectCompletions = pgTable(
  "project_completions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    bonusPoints: integer("bonus_points").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_completions_project_user_unique").on(
      table.projectId,
      table.userId
    ),
  ]
);

// ─── Point Transactions ───────────────────────────────────────────────────────

export const pointTransactions = pgTable(
  "point_transactions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    amount: integer("amount").notNull(), // positive = award, negative = reversal
    sourceType: text("source_type").notNull(), // task_completion | project_completion | admin_grant | reversal | referral
    sourceId: uuid("source_id"),
    description: text("description"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("point_transactions_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  ]
);

// ─── Types ───────────────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type NewTaskCompletion = typeof taskCompletions.$inferInsert;
export type ProjectCompletion = typeof projectCompletions.$inferSelect;
export type PointTransaction = typeof pointTransactions.$inferSelect;

// ─── JSONB Types ──────────────────────────────────────────────────────────────

export type FormFieldType = "text" | "number" | "select" | "checkbox" | "link";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[]; // for select type
}

export interface FormSchema {
  fields: FormField[];
}

export interface LocationTargetPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  radiusMeters?: number;
  maxCompletions?: number; // per-user limit at this specific point (null/undefined = unlimited)
}

export interface TaskLocationData {
  center: [number, number];
  defaultZoom?: number;
  description?: string;
  targetPoints: LocationTargetPoint[];
  areaPolygon?: unknown; // GeoJSON polygon
}

export interface CompletionLocationData {
  lat: number;
  lng: number;
  selectedPointId?: string;
  timestamp: string;
}
