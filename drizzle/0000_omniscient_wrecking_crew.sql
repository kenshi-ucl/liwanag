CREATE TABLE "enrichment_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"enrichment_id" varchar(255),
	"estimated_credits" integer NOT NULL,
	"actual_credits" integer,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_type" varchar(20) NOT NULL,
	"source" varchar(100),
	"linkedin_url" text,
	"job_title" varchar(255),
	"company_name" varchar(255),
	"company_domain" varchar(255),
	"headcount" integer,
	"industry" varchar(100),
	"icp_score" integer,
	"synced_to_crm" boolean DEFAULT false,
	"synced_at" timestamp with time zone,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"signature" text,
	"is_valid" boolean NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrichment_jobs" ADD CONSTRAINT "enrichment_jobs_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE no action ON UPDATE no action;