import { pgTable, text, timestamp, boolean, integer, json, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// -- Better Auth required tables --

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  role: text("role").default("user").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// -- App tables --

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  nameId: text("name_id").notNull(),
  nameEn: text("name_en").notNull(),
  slug: text("slug").notNull().unique(),
  descriptionId: text("description_id"),
  descriptionEn: text("description_en"),
  icon: text("icon"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const packages = pgTable("packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  nameId: text("name_id").notNull(),
  nameEn: text("name_en").notNull(),
  price: integer("price").notNull(),
  warrantyDays: integer("warranty_days").notNull(),
  featuresId: json("features_id").$type<string[]>().notNull(),
  featuresEn: json("features_en").$type<string[]>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  packageId: uuid("package_id").notNull().references(() => packages.id),
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method"),
  status: text("status").default("pending").notNull(), // pending | paid | failed | cancelled
  paymentUrl: text("payment_url"),
  externalRefId: text("external_ref_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  packageId: uuid("package_id").notNull().references(() => packages.id),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  status: text("status").default("active").notNull(), // active | expired
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  warrantyEndsAt: timestamp("warranty_ends_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: json("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -- Relations --

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  subscriptions: many(subscriptions),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  packages: many(packages),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  service: one(services, { fields: [packages.serviceId], references: [services.id] }),
  subscriptions: many(subscriptions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  package: one(packages, { fields: [transactions.packageId], references: [packages.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  package: one(packages, { fields: [subscriptions.packageId], references: [packages.id] }),
  transaction: one(transactions, { fields: [subscriptions.transactionId], references: [transactions.id] }),
}));
