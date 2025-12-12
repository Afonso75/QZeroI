import { pgTable, text, timestamp, varchar, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: varchar('full_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  birthdate: varchar('birthdate', { length: 50 }),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  accountType: varchar('account_type', { length: 50 }).notNull(),
  isBusinessUser: boolean('is_business_user').default(false).notNull(),
  isStaffMember: boolean('is_staff_member').default(false).notNull(),
  businessId: varchar('business_id', { length: 255 }),
  staffPermissions: jsonb('staff_permissions'),
  onboardingCompleted: boolean('onboarding_completed').default(true).notNull(),
  hasBusinessSubscription: boolean('has_business_subscription').default(false).notNull(),
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('pt'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const companyProfiles = pgTable('company_profiles', {
  id: varchar('id', { length: 255 }).primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companyVAT: varchar('company_vat', { length: 50 }),
  companyCountry: varchar('company_country', { length: 100 }).default('Portugal'),
  companyAddress: text('company_address'),
  companyCity: varchar('company_city', { length: 100 }),
  companyPostalCode: varchar('company_postal_code', { length: 20 }),
  companyStreetName: varchar('company_street_name', { length: 255 }),
  companyDoorNumber: varchar('company_door_number', { length: 50 }),
  companyDistrict: varchar('company_district', { length: 100 }),
  companyPhone: varchar('company_phone', { length: 50 }),
  companyEmail: varchar('company_email', { length: 255 }).notNull(),
  companyCategory: varchar('company_category', { length: 100 }),
  customCategory: varchar('custom_category', { length: 255 }),
  companyDescription: text('company_description'),
  companyCoordinates: jsonb('company_coordinates'),
  logoUrl: text('logo_url'),
  photoUrl: text('photo_url'),
  mediaGallery: jsonb('media_gallery'),
  adminUserId: varchar('admin_user_id', { length: 255 }).notNull(),
  
  status: varchar('status', { length: 50 }).default('pending_payment').notNull(),
  subscriptionId: varchar('subscription_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  subscriptionStatus: varchar('subscription_status', { length: 50 }),
  
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  currentPeriodEnd: timestamp('current_period_end'),
  
  temporaryAccess: jsonb('temporary_access'),
  paymentRetry: jsonb('payment_retry'),
  
  // In-App Purchase fields (iOS/Android)
  subscriptionPlan: varchar('subscription_plan', { length: 100 }),
  subscriptionStartDate: timestamp('subscription_start_date'),
  subscriptionEndDate: timestamp('subscription_end_date'),
  subscriptionPaymentMethod: varchar('subscription_payment_method', { length: 50 }),
  iapTransactionId: varchar('iap_transaction_id', { length: 255 }),
  iapProductId: varchar('iap_product_id', { length: 255 }),
  iapPlatform: varchar('iap_platform', { length: 20 }),
  iapLastValidated: timestamp('iap_last_validated'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const staffInvites = pgTable('staff_invites', {
  id: varchar('id', { length: 255 }).primaryKey(),
  businessId: varchar('business_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('pendente').notNull(),
  permissions: jsonb('permissions'),
  invitedBy: varchar('invited_by', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const challengeTokens = pgTable('challenge_tokens', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  used: boolean('used').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const verificationCodes = pgTable('verification_codes', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  challengeToken: varchar('challenge_token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verified: boolean('verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const consents = pgTable('consents', {
  id: varchar('id', { length: 255 }).primaryKey(),
  guestId: varchar('guest_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }),
  consent: boolean('consent').default(true).notNull(),
  version: varchar('version', { length: 50 }).notNull(),
  userAgent: text('user_agent'),
  locale: varchar('locale', { length: 10 }),
  ip: varchar('ip', { length: 100 }),
  source: varchar('source', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tickets = pgTable('tickets', {
  id: varchar('id', { length: 255 }).primaryKey(),
  ticketNumber: integer('ticket_number').notNull(),
  queueId: varchar('queue_id', { length: 255 }).notNull(),
  businessId: varchar('business_id', { length: 255 }).notNull(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  userName: varchar('user_name', { length: 255 }),
  userPhone: varchar('user_phone', { length: 50 }),
  status: varchar('status', { length: 50 }).default('aguardando').notNull(),
  isManual: boolean('is_manual').default(false),
  manualName: varchar('manual_name', { length: 255 }),
  estimatedTime: integer('estimated_time'),
  position: integer('position'),
  calledAt: timestamp('called_at'),
  completedAt: timestamp('completed_at'),
  attendingStartedAt: timestamp('attending_started_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const queues = pgTable('queues', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  businessId: varchar('business_id', { length: 255 }).notNull(),
  currentNumber: integer('current_number').default(0).notNull(),
  lastIssuedNumber: integer('last_issued_number').default(0).notNull(),
  averageServiceTime: integer('average_service_time').default(10).notNull(),
  toleranceTime: integer('tolerance_time').default(15).notNull(),
  maxCapacity: integer('max_capacity').default(100),
  status: varchar('status', { length: 50 }).default('aberta').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  workingHours: jsonb('working_hours'),
  lastResetDate: varchar('last_reset_date', { length: 20 }),
  notificationsEnabled: boolean('notifications_enabled').default(false),
  notificationSettings: jsonb('notification_settings'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const services = pgTable('services', {
  id: varchar('id', { length: 255 }).primaryKey(),
  businessId: varchar('business_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  duration: integer('duration').default(30).notNull(),
  toleranceTime: integer('tolerance_time').default(15),
  price: integer('price').default(0),
  maxDailySlots: integer('max_daily_slots').default(10),
  availableDays: jsonb('available_days'),
  workingHours: jsonb('working_hours'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const appointments = pgTable('appointments', {
  id: varchar('id', { length: 255 }).primaryKey(),
  businessId: varchar('business_id', { length: 255 }).notNull(),
  serviceId: varchar('service_id', { length: 255 }),
  serviceName: varchar('service_name', { length: 255 }),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  userName: varchar('user_name', { length: 255 }),
  userPhone: varchar('user_phone', { length: 50 }),
  status: varchar('status', { length: 50 }).default('agendado').notNull(),
  appointmentDate: varchar('appointment_date', { length: 50 }).notNull(),
  appointmentTime: varchar('appointment_time', { length: 20 }).notNull(),
  duration: integer('duration').default(30),
  bufferTime: integer('buffer_time').default(0),
  notes: text('notes'),
  businessResponse: text('business_response'),
  rating: integer('rating'),
  feedback: text('feedback'),
  reminderSent: boolean('reminder_sent').default(false),
  managementToken: varchar('management_token', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deviceTokens = pgTable('device_tokens', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  token: text('token').notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  deviceInfo: jsonb('device_info'),
  isActive: boolean('is_active').default(true).notNull(),
  lastUsedAt: timestamp('last_used_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pushNotifications = pgTable('push_notifications', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  data: jsonb('data'),
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
