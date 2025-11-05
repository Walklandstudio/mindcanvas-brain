create schema if not exists "portal";

create sequence "public"."base_options_id_seq";

create sequence "public"."base_questions_id_seq";


  create table "portal"."dashboard_scores" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid,
    "test_id" uuid,
    "taker_id" uuid,
    "submission_id" uuid,
    "profile_code" text not null,
    "profile_name" text not null,
    "frequency_code" text,
    "frequency_name" text,
    "points" numeric not null,
    "created_at" timestamp with time zone default now(),
    "org_slug" text
      );



  create table "portal"."orgs" (
    "id" uuid not null default gen_random_uuid(),
    "slug" text not null,
    "name" text not null,
    "created_at" timestamp with time zone not null default now()
      );



  create table "portal"."test_answers" (
    "id" uuid not null default gen_random_uuid(),
    "taker_id" uuid not null,
    "question_id" uuid not null,
    "choice" smallint not null,
    "created_at" timestamp with time zone not null default now()
      );



  create table "portal"."test_frequency_labels" (
    "test_id" uuid not null,
    "frequency_code" text not null,
    "frequency_name" text not null
      );



  create table "portal"."test_links" (
    "id" uuid not null default gen_random_uuid(),
    "test_id" uuid not null,
    "token" text not null,
    "max_uses" integer,
    "use_count" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "org_id" uuid not null
      );



  create table "portal"."test_profile_labels" (
    "test_id" uuid not null,
    "profile_code" text not null,
    "profile_name" text not null,
    "frequency_code" text
      );



  create table "portal"."test_questions" (
    "id" uuid not null default gen_random_uuid(),
    "test_id" uuid not null,
    "idx" integer,
    "order" integer,
    "type" text,
    "text" text,
    "options" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "weights" jsonb default '{}'::jsonb,
    "category" text default 'scored'::text,
    "profile_map" jsonb default '[]'::jsonb
      );



  create table "portal"."test_results" (
    "id" uuid not null default gen_random_uuid(),
    "taker_id" uuid not null,
    "totals" jsonb not null,
    "created_at" timestamp with time zone not null default now()
      );



  create table "portal"."test_submissions" (
    "id" uuid not null default gen_random_uuid(),
    "taker_id" uuid not null,
    "test_id" uuid not null,
    "link_token" text not null,
    "totals" jsonb not null default '{}'::jsonb,
    "raw_answers" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "company" text,
    "role_title" text,
    "first_name" text,
    "last_name" text,
    "email" text,
    "answers_json" jsonb default '{}'::jsonb
      );



  create table "portal"."test_takers" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "test_id" uuid not null,
    "link_token" text not null,
    "email" text,
    "first_name" text,
    "last_name" text,
    "status" text not null default 'started'::text,
    "created_at" timestamp with time zone not null default now(),
    "phone" text,
    "meta" jsonb default '{}'::jsonb,
    "company" text,
    "role_title" text
      );



  create table "portal"."tests" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "name" text not null,
    "slug" text,
    "mode" text not null default 'full'::text,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone not null default now(),
    "meta" jsonb
      );



  create table "public"."base_options" (
    "id" integer not null default nextval('public.base_options_id_seq'::regclass),
    "question_id" integer not null,
    "onum" integer not null,
    "text" text not null,
    "points" integer not null,
    "profile_index" integer not null,
    "frequency" text not null
      );



  create table "public"."base_questions" (
    "id" integer not null default nextval('public.base_questions_id_seq'::regclass),
    "qnum" integer not null,
    "text" text not null
      );



  create table "public"."brand_settings" (
    "org_id" uuid not null,
    "logo_url" text,
    "font" text,
    "colors" jsonb default '{}'::jsonb,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."brand_settings" enable row level security;


  create table "public"."framework_settings" (
    "org_id" uuid not null,
    "frequencies" text not null default 'A,B,C,D'::text,
    "profiles_count" integer not null default 8,
    "notes" text,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."framework_settings" enable row level security;


  create table "public"."frameworks" (
    "key" text not null,
    "name" text not null
      );



  create table "public"."org_brand_settings" (
    "org_id" uuid not null,
    "brand_voice" text,
    "audience" text,
    "notes" text,
    "updated_at" timestamp with time zone not null default now(),
    "logo_url" text
      );


alter table "public"."org_brand_settings" enable row level security;


  create table "public"."org_frameworks" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "name" text not null,
    "version" text not null default 1,
    "created_at" timestamp with time zone not null default now(),
    "owner_id" uuid,
    "frequency_meta" jsonb not null default '{}'::jsonb
      );


alter table "public"."org_frameworks" enable row level security;


  create table "public"."org_frequencies" (
    "id" uuid not null default gen_random_uuid(),
    "framework_id" uuid not null,
    "code" text not null,
    "name" text not null,
    "color" text not null default '#2d8fc4'::text,
    "description" text default ''::text
      );



  create table "public"."org_members" (
    "org_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'owner'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."org_members" enable row level security;


  create table "public"."org_memberships" (
    "org_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'owner'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."org_memberships" enable row level security;


  create table "public"."org_onboarding" (
    "org_id" uuid not null,
    "step_account" jsonb not null default '{}'::jsonb,
    "step_company" jsonb not null default '{}'::jsonb,
    "step_branding" jsonb not null default '{}'::jsonb,
    "step_goals" jsonb not null default '{}'::jsonb,
    "completion" integer not null default 0,
    "updated_at" timestamp with time zone default now(),
    "account" jsonb not null default '{}'::jsonb,
    "company" jsonb not null default '{}'::jsonb,
    "branding" jsonb not null default '{}'::jsonb,
    "goals" jsonb not null default '{}'::jsonb,
    "create_account" jsonb not null default '{}'::jsonb,
    "data" jsonb not null default '{}'::jsonb,
    "progress" integer not null default 0
      );


alter table "public"."org_onboarding" enable row level security;


  create table "public"."org_profile_codes" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "code" text not null,
    "name" text not null,
    "flow" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."org_profile_codes" enable row level security;


  create table "public"."org_profile_compatibility" (
    "id" uuid not null default gen_random_uuid(),
    "framework_id" uuid not null,
    "profile_a_id" uuid not null,
    "profile_b_id" uuid not null,
    "score" integer not null,
    "notes" text default ''::text
      );


alter table "public"."org_profile_compatibility" enable row level security;


  create table "public"."org_profile_reports" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "framework_id" uuid not null,
    "profile_id" uuid not null,
    "sections" jsonb not null default '{}'::jsonb,
    "updated_at" timestamp with time zone default now(),
    "strengths" text not null default ''::text,
    "challenges" text not null default ''::text,
    "roles" text not null default ''::text,
    "guidance" text not null default ''::text,
    "approved" boolean not null default false
      );


alter table "public"."org_profile_reports" enable row level security;


  create table "public"."org_profiles" (
    "org_id" uuid not null,
    "company_name" text default ''::text,
    "first_name" text default ''::text,
    "last_name" text default ''::text,
    "position" text,
    "contact_email" text default 'demo@example.com'::text,
    "phone_country" text,
    "phone_number" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "id" uuid not null default gen_random_uuid(),
    "framework_id" uuid,
    "image_url" text,
    "image_prompt" text,
    "frequency" text,
    "ordinal" integer not null default 0,
    "name" text,
    "summary" text,
    "strengths" jsonb,
    "code" text not null
      );


alter table "public"."org_profiles" enable row level security;


  create table "public"."org_question_options" (
    "id" uuid not null default gen_random_uuid(),
    "question_id" uuid not null,
    "label" text not null,
    "position" integer not null
      );



  create table "public"."org_question_weights" (
    "question_id" uuid not null,
    "option_id" uuid not null,
    "freq" text not null,
    "weight" integer not null default 1
      );



  create table "public"."org_questions" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "framework_id" uuid,
    "text" text not null,
    "is_segmentation" boolean not null default false,
    "position" integer not null
      );



  create table "public"."org_report_drafts" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "framework_id" uuid not null,
    "profile_name" text not null,
    "sections" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."org_report_drafts" enable row level security;


  create table "public"."org_test_answers" (
    "id" uuid not null default gen_random_uuid(),
    "question_id" uuid not null,
    "ordinal" integer not null,
    "text" text not null default ''::text,
    "points" integer not null default 0,
    "frequency" text not null default 'A'::text,
    "profile_index" integer not null default 1,
    "created_at" timestamp with time zone not null default now(),
    "org_id" uuid
      );



  create table "public"."org_test_defs" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "framework_id" uuid not null,
    "name" text not null,
    "mode" text not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."org_test_questions" (
    "id" uuid not null default gen_random_uuid(),
    "test_id" uuid not null,
    "q_no" integer not null,
    "source" text not null,
    "prompt" text not null,
    "options" jsonb not null default '[]'::jsonb,
    "weights" jsonb,
    "created_at" timestamp with time zone default now(),
    "qnum" integer,
    "ordinal" integer not null default 1,
    "text" text not null default ''::text,
    "org_id" uuid
      );



  create table "public"."org_tests" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "name" text not null,
    "mode" text not null default 'full'::text,
    "created_at" timestamp with time zone not null default now(),
    "slug" text,
    "status" text
      );


alter table "public"."org_tests" enable row level security;


  create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "created_at" timestamp with time zone default now(),
    "owner_user_id" uuid,
    "created_by" uuid
      );


alter table "public"."organizations" enable row level security;


  create table "public"."portal_invites" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "email" text not null,
    "role" text not null default 'client'::text,
    "token" uuid not null default gen_random_uuid(),
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."portal_invites" enable row level security;


  create table "public"."portal_members" (
    "org_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'client'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."portal_members" enable row level security;


  create table "public"."profile_compat" (
    "org_id" uuid not null,
    "a_key" text not null,
    "b_key" text not null,
    "score" integer not null default 0,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."profile_compat" enable row level security;


  create table "public"."profile_content" (
    "org_id" uuid not null,
    "profile_key" text not null,
    "sections" jsonb not null default '{}'::jsonb,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."profile_content" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "key" text not null,
    "freq_key" text not null,
    "name" text not null,
    "color" text default '#111111'::text,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "framework_key" text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."profiles_drafts" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid,
    "profile_name" text not null,
    "frequency" text not null,
    "content" jsonb not null,
    "status" text not null default 'draft'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."report_drafts" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "test_id" uuid not null,
    "content" jsonb not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."report_drafts" enable row level security;


  create table "public"."report_signoffs" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "test_id" uuid not null,
    "content" jsonb not null,
    "signed_by" uuid not null,
    "signed_at" timestamp with time zone not null default now()
      );


alter table "public"."report_signoffs" enable row level security;


  create table "public"."report_templates" (
    "org_id" uuid not null,
    "name" text not null default 'Default'::text,
    "sections_order" text[] not null default ARRAY['intro'::text, 'strengths'::text, 'challenges'::text, 'guidance'::text, 'coaching_prompts'::text, 'visibility_strategy'::text]
      );


alter table "public"."report_templates" enable row level security;


  create table "public"."template_profile_content" (
    "template_id" uuid not null,
    "profile_key" text not null,
    "sections" jsonb not null default '{}'::jsonb
      );



  create table "public"."template_profiles" (
    "template_id" uuid not null,
    "key" text not null,
    "freq_key" text not null,
    "name" text not null,
    "color" text not null default '#111111'::text,
    "description" text
      );



  create table "public"."template_questions" (
    "id" uuid not null default gen_random_uuid(),
    "template_id" uuid not null,
    "order" integer not null,
    "type" text not null,
    "text" text not null,
    "scoring" jsonb not null default '{}'::jsonb,
    "visible_in_free" boolean not null default false,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."template_report_templates" (
    "template_id" uuid not null,
    "sections_order" text[] not null default ARRAY['intro'::text, 'strengths'::text, 'challenges'::text, 'guidance'::text, 'coaching_prompts'::text, 'visibility_strategy'::text]
      );



  create table "public"."templates" (
    "id" uuid not null default gen_random_uuid(),
    "key" text not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."test_answers" (
    "id" uuid not null default gen_random_uuid(),
    "test_id" uuid not null,
    "taker_id" uuid not null,
    "question_id" uuid not null,
    "answer_text" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."test_answers" enable row level security;


  create table "public"."test_deployments" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "test_id" uuid not null,
    "slug" text not null,
    "title" text not null default 'Profile Test'::text,
    "mode" text not null default 'full'::text,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."test_deployments" enable row level security;


  create table "public"."test_links" (
    "id" uuid not null default gen_random_uuid(),
    "test_id" uuid not null,
    "token" text not null,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone,
    "mode" text not null default 'full'::text,
    "org_id" uuid not null,
    "taker_id" uuid,
    "max_uses" integer default 1,
    "uses" integer default 0,
    "kind" text default 'full'::text
      );


alter table "public"."test_links" enable row level security;


  create table "public"."test_options" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "question_id" uuid not null,
    "idx" integer not null,
    "label" text not null,
    "label_rephrased" text,
    "frequency" text not null default 'standard'::text,
    "profile" text not null default 'generic'::text,
    "points" integer not null default 0,
    "affects_scoring" boolean not null default true,
    "code" text,
    "text" text,
    "weights" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."test_options" enable row level security;


  create table "public"."test_questions" (
    "id" uuid not null default gen_random_uuid(),
    "test_id" uuid not null,
    "order" integer not null,
    "type" text not null default 'text'::text,
    "text" text not null,
    "options" jsonb,
    "created_at" timestamp with time zone default now(),
    "visible_in_free" boolean not null default false,
    "org_id" uuid,
    "kind" text not null default 'base'::text,
    "idx" integer
      );


alter table "public"."test_questions" enable row level security;


  create table "public"."test_results" (
    "id" uuid not null default gen_random_uuid(),
    "test_id" uuid not null,
    "taker_id" uuid not null,
    "freq_scores" jsonb not null default '{}'::jsonb,
    "profile_key" text,
    "profile_exact_key" text,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."test_submissions" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "test_id" uuid not null,
    "taker_id" uuid not null,
    "submitted_at" timestamp with time zone not null default now(),
    "driver" jsonb not null,
    "raw" jsonb not null,
    "link_token" text,
    "taker_email" text,
    "taker_name" text,
    "total_points" integer,
    "frequency" text,
    "profile" text,
    "answers" jsonb,
    "first_name" text,
    "last_name" text,
    "email" text,
    "company" text,
    "role_title" text
      );


alter table "public"."test_submissions" enable row level security;


  create table "public"."test_takers" (
    "id" uuid not null default gen_random_uuid(),
    "test_id" uuid not null,
    "token" text not null,
    "first_name" text,
    "last_name" text,
    "email" text,
    "phone" text,
    "company" text,
    "team" text,
    "team_function" text,
    "created_at" timestamp with time zone default now(),
    "org_id" uuid not null,
    "name" text,
    "role_title" text
      );


alter table "public"."test_takers" enable row level security;


  create table "public"."tests" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "name" text not null,
    "status" text not null default 'draft'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."tests" enable row level security;

alter sequence "public"."base_options_id_seq" owned by "public"."base_options"."id";

alter sequence "public"."base_questions_id_seq" owned by "public"."base_questions"."id";

CREATE UNIQUE INDEX dashboard_scores_pkey ON portal.dashboard_scores USING btree (id);

CREATE INDEX idx_portal_q_test_id ON portal.test_questions USING btree (test_id);

CREATE INDEX idx_portal_takers_org_id ON portal.test_takers USING btree (org_id);

CREATE INDEX idx_portal_takers_test_id ON portal.test_takers USING btree (test_id);

CREATE INDEX idx_portal_test_links_test_id ON portal.test_links USING btree (test_id);

CREATE INDEX idx_portal_test_links_token ON portal.test_links USING btree (token);

CREATE INDEX idx_portal_tests_org_id ON portal.tests USING btree (org_id);

CREATE INDEX idx_submissions_taker ON portal.test_submissions USING btree (taker_id DESC);

CREATE INDEX idx_test_answers_taker ON portal.test_answers USING btree (taker_id);

CREATE INDEX idx_test_links_token ON portal.test_links USING btree (token);

CREATE INDEX idx_test_questions_test ON portal.test_questions USING btree (test_id);

CREATE INDEX idx_test_results_taker ON portal.test_results USING btree (taker_id);

CREATE INDEX idx_test_takers_link_token ON portal.test_takers USING btree (link_token);

CREATE INDEX idx_tfl_test ON portal.test_frequency_labels USING btree (test_id);

CREATE INDEX idx_tpl_test ON portal.test_profile_labels USING btree (test_id);

CREATE UNIQUE INDEX orgs_pkey ON portal.orgs USING btree (id);

CREATE UNIQUE INDEX orgs_slug_key ON portal.orgs USING btree (slug);

CREATE UNIQUE INDEX test_answers_pkey ON portal.test_answers USING btree (id);

CREATE UNIQUE INDEX test_frequency_labels_pk ON portal.test_frequency_labels USING btree (test_id, frequency_code);

CREATE UNIQUE INDEX test_links_pkey ON portal.test_links USING btree (id);

CREATE UNIQUE INDEX test_links_token_key ON portal.test_links USING btree (token);

CREATE UNIQUE INDEX test_profile_labels_pk ON portal.test_profile_labels USING btree (test_id, profile_code);

CREATE UNIQUE INDEX test_questions_pkey ON portal.test_questions USING btree (id);

CREATE UNIQUE INDEX test_results_pkey ON portal.test_results USING btree (id);

CREATE UNIQUE INDEX test_results_taker_id_key ON portal.test_results USING btree (taker_id);

CREATE UNIQUE INDEX test_submissions_pkey ON portal.test_submissions USING btree (id);

CREATE UNIQUE INDEX test_takers_pkey ON portal.test_takers USING btree (id);

CREATE UNIQUE INDEX tests_pkey ON portal.tests USING btree (id);

CREATE UNIQUE INDEX tests_slug_key ON portal.tests USING btree (slug);

CREATE UNIQUE INDEX uq_dashboard_scores_submission_profile ON portal.dashboard_scores USING btree (submission_id, profile_code);

CREATE UNIQUE INDEX uq_test_links_token ON portal.test_links USING btree (token);

CREATE UNIQUE INDEX uq_tests_org_slug ON portal.tests USING btree (org_id, slug);

CREATE UNIQUE INDEX base_options_pkey ON public.base_options USING btree (id);

CREATE UNIQUE INDEX base_options_question_id_onum_key ON public.base_options USING btree (question_id, onum);

CREATE UNIQUE INDEX base_questions_pkey ON public.base_questions USING btree (id);

CREATE UNIQUE INDEX base_questions_qnum_key ON public.base_questions USING btree (qnum);

CREATE UNIQUE INDEX brand_settings_pkey ON public.brand_settings USING btree (org_id);

CREATE UNIQUE INDEX framework_settings_pkey ON public.framework_settings USING btree (org_id);

CREATE UNIQUE INDEX frameworks_pkey ON public.frameworks USING btree (key);

CREATE INDEX idx_base_options_q ON public.base_options USING btree (question_id);

CREATE INDEX idx_compat_org ON public.profile_compat USING btree (org_id);

CREATE INDEX idx_org_profiles_org_fw ON public.org_profiles USING btree (org_id, framework_id);

CREATE INDEX idx_org_test_questions_test ON public.org_test_questions USING btree (test_id);

CREATE INDEX idx_profiles_drafts_org_profile ON public.profiles_drafts USING btree (org_id, profile_name, frequency);

CREATE INDEX idx_reports_org_fw_prof ON public.org_profile_reports USING btree (org_id, framework_id, profile_id);

CREATE INDEX idx_results_test_taker ON public.test_results USING btree (test_id, taker_id);

CREATE INDEX idx_takers_test_team ON public.test_takers USING btree (test_id, team);

CREATE INDEX idx_test_deployments_slug ON public.test_deployments USING btree (slug);

CREATE INDEX idx_test_links_org ON public.test_links USING btree (org_id);

CREATE INDEX idx_test_links_test ON public.test_links USING btree (test_id);

CREATE INDEX idx_test_links_token ON public.test_links USING btree (token);

CREATE INDEX idx_test_questions_free ON public.test_questions USING btree (test_id, visible_in_free);

CREATE INDEX idx_test_results_test ON public.test_results USING btree (test_id);

CREATE INDEX idx_test_takers_org_test ON public.test_takers USING btree (org_id, test_id);

CREATE INDEX idx_test_takers_test_email ON public.test_takers USING btree (test_id, email);

CREATE INDEX idx_test_takers_test_id ON public.test_takers USING btree (test_id);

CREATE INDEX idx_test_takers_token ON public.test_takers USING btree (token);

CREATE UNIQUE INDEX org_brand_settings_pkey ON public.org_brand_settings USING btree (org_id);

CREATE UNIQUE INDEX org_frameworks_one_per_org ON public.org_frameworks USING btree (org_id);

CREATE UNIQUE INDEX org_frameworks_pkey ON public.org_frameworks USING btree (id);

CREATE UNIQUE INDEX org_frequencies_pkey ON public.org_frequencies USING btree (id);

CREATE UNIQUE INDEX org_members_pkey ON public.org_members USING btree (org_id, user_id);

CREATE UNIQUE INDEX org_memberships_pkey ON public.org_memberships USING btree (org_id, user_id);

CREATE UNIQUE INDEX org_onboarding_pkey ON public.org_onboarding USING btree (org_id);

CREATE UNIQUE INDEX org_profile_codes_org_id_code_key ON public.org_profile_codes USING btree (org_id, code);

CREATE UNIQUE INDEX org_profile_codes_pkey ON public.org_profile_codes USING btree (id);

CREATE UNIQUE INDEX org_profile_compatibility_framework_id_profile_a_id_profile_key ON public.org_profile_compatibility USING btree (framework_id, profile_a_id, profile_b_id);

CREATE UNIQUE INDEX org_profile_compatibility_pkey ON public.org_profile_compatibility USING btree (id);

CREATE INDEX org_profile_reports_framework_id_idx ON public.org_profile_reports USING btree (framework_id);

CREATE INDEX org_profile_reports_org_id_idx ON public.org_profile_reports USING btree (org_id);

CREATE UNIQUE INDEX org_profile_reports_pkey ON public.org_profile_reports USING btree (id);

CREATE UNIQUE INDEX org_profile_reports_profile_id_key ON public.org_profile_reports USING btree (profile_id);

CREATE INDEX org_profiles_framework_idx ON public.org_profiles USING btree (framework_id);

CREATE UNIQUE INDEX org_profiles_org_id_code_key ON public.org_profiles USING btree (org_id, code);

CREATE INDEX org_profiles_org_id_idx ON public.org_profiles USING btree (org_id);

CREATE UNIQUE INDEX org_profiles_pkey ON public.org_profiles USING btree (id);

CREATE UNIQUE INDEX org_question_options_pkey ON public.org_question_options USING btree (id);

CREATE UNIQUE INDEX org_question_weights_pkey ON public.org_question_weights USING btree (question_id, option_id, freq);

CREATE UNIQUE INDEX org_questions_pkey ON public.org_questions USING btree (id);

CREATE UNIQUE INDEX org_report_drafts_pkey ON public.org_report_drafts USING btree (id);

CREATE UNIQUE INDEX org_test_answers_pkey ON public.org_test_answers USING btree (id);

CREATE INDEX org_test_answers_question_id_ord_idx ON public.org_test_answers USING btree (question_id, ordinal);

CREATE UNIQUE INDEX org_test_defs_pkey ON public.org_test_defs USING btree (id);

CREATE UNIQUE INDEX org_test_questions_pkey ON public.org_test_questions USING btree (id);

CREATE INDEX org_test_questions_test_id_qnum_idx ON public.org_test_questions USING btree (test_id, qnum);

CREATE UNIQUE INDEX org_tests_org_id_slug_key ON public.org_tests USING btree (org_id, slug);

CREATE UNIQUE INDEX org_tests_pkey ON public.org_tests USING btree (id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);

CREATE UNIQUE INDEX organizations_slug_udx ON public.organizations USING btree (slug);

CREATE UNIQUE INDEX portal_invites_org_id_email_key ON public.portal_invites USING btree (org_id, email);

CREATE UNIQUE INDEX portal_invites_pkey ON public.portal_invites USING btree (id);

CREATE UNIQUE INDEX portal_members_pkey ON public.portal_members USING btree (org_id, user_id);

CREATE UNIQUE INDEX profile_compat_pkey ON public.profile_compat USING btree (org_id, a_key, b_key);

CREATE UNIQUE INDEX profile_content_pkey ON public.profile_content USING btree (org_id, profile_key);

CREATE UNIQUE INDEX profiles_drafts_pkey ON public.profiles_drafts USING btree (id);

CREATE UNIQUE INDEX profiles_org_id_key_key ON public.profiles USING btree (org_id, key);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX report_drafts_pkey ON public.report_drafts USING btree (id);

CREATE UNIQUE INDEX report_signoffs_pkey ON public.report_signoffs USING btree (id);

CREATE UNIQUE INDEX report_templates_pkey ON public.report_templates USING btree (org_id);

CREATE UNIQUE INDEX template_profile_content_pkey ON public.template_profile_content USING btree (template_id, profile_key);

CREATE UNIQUE INDEX template_profiles_pkey ON public.template_profiles USING btree (template_id, key);

CREATE UNIQUE INDEX template_questions_pkey ON public.template_questions USING btree (id);

CREATE UNIQUE INDEX template_report_templates_pkey ON public.template_report_templates USING btree (template_id);

CREATE UNIQUE INDEX templates_key_key ON public.templates USING btree (key);

CREATE UNIQUE INDEX templates_pkey ON public.templates USING btree (id);

CREATE UNIQUE INDEX test_answers_pkey ON public.test_answers USING btree (id);

CREATE UNIQUE INDEX test_deployments_pkey ON public.test_deployments USING btree (id);

CREATE UNIQUE INDEX test_deployments_slug_key ON public.test_deployments USING btree (slug);

CREATE UNIQUE INDEX test_links_pkey ON public.test_links USING btree (id);

CREATE UNIQUE INDEX test_links_token_idx ON public.test_links USING btree (token);

CREATE UNIQUE INDEX test_links_token_key ON public.test_links USING btree (token);

CREATE UNIQUE INDEX test_options_pkey ON public.test_options USING btree (id);

CREATE UNIQUE INDEX test_options_question_id_code_key ON public.test_options USING btree (question_id, code);

CREATE UNIQUE INDEX test_options_question_id_idx_key ON public.test_options USING btree (question_id, idx);

CREATE UNIQUE INDEX test_questions_pkey ON public.test_questions USING btree (id);

CREATE UNIQUE INDEX test_questions_test_id_idx_key ON public.test_questions USING btree (test_id, idx);

CREATE UNIQUE INDEX test_questions_test_id_order_key ON public.test_questions USING btree (test_id, "order");

CREATE UNIQUE INDEX test_results_pkey ON public.test_results USING btree (id);

CREATE UNIQUE INDEX test_submissions_pkey ON public.test_submissions USING btree (id);

CREATE UNIQUE INDEX test_takers_pkey ON public.test_takers USING btree (id);

CREATE UNIQUE INDEX tests_pkey ON public.tests USING btree (id);

CREATE UNIQUE INDEX uq_template_questions_template_order ON public.template_questions USING btree (template_id, "order");

CREATE UNIQUE INDEX uq_test_links_token ON public.test_links USING btree (token);

CREATE UNIQUE INDEX uq_test_results_test_taker ON public.test_results USING btree (test_id, taker_id);

CREATE UNIQUE INDEX uq_test_takers_org_test_email ON public.test_takers USING btree (org_id, test_id, email);

alter table "portal"."dashboard_scores" add constraint "dashboard_scores_pkey" PRIMARY KEY using index "dashboard_scores_pkey";

alter table "portal"."orgs" add constraint "orgs_pkey" PRIMARY KEY using index "orgs_pkey";

alter table "portal"."test_answers" add constraint "test_answers_pkey" PRIMARY KEY using index "test_answers_pkey";

alter table "portal"."test_frequency_labels" add constraint "test_frequency_labels_pk" PRIMARY KEY using index "test_frequency_labels_pk";

alter table "portal"."test_links" add constraint "test_links_pkey" PRIMARY KEY using index "test_links_pkey";

alter table "portal"."test_profile_labels" add constraint "test_profile_labels_pk" PRIMARY KEY using index "test_profile_labels_pk";

alter table "portal"."test_questions" add constraint "test_questions_pkey" PRIMARY KEY using index "test_questions_pkey";

alter table "portal"."test_results" add constraint "test_results_pkey" PRIMARY KEY using index "test_results_pkey";

alter table "portal"."test_submissions" add constraint "test_submissions_pkey" PRIMARY KEY using index "test_submissions_pkey";

alter table "portal"."test_takers" add constraint "test_takers_pkey" PRIMARY KEY using index "test_takers_pkey";

alter table "portal"."tests" add constraint "tests_pkey" PRIMARY KEY using index "tests_pkey";

alter table "public"."base_options" add constraint "base_options_pkey" PRIMARY KEY using index "base_options_pkey";

alter table "public"."base_questions" add constraint "base_questions_pkey" PRIMARY KEY using index "base_questions_pkey";

alter table "public"."brand_settings" add constraint "brand_settings_pkey" PRIMARY KEY using index "brand_settings_pkey";

alter table "public"."framework_settings" add constraint "framework_settings_pkey" PRIMARY KEY using index "framework_settings_pkey";

alter table "public"."frameworks" add constraint "frameworks_pkey" PRIMARY KEY using index "frameworks_pkey";

alter table "public"."org_brand_settings" add constraint "org_brand_settings_pkey" PRIMARY KEY using index "org_brand_settings_pkey";

alter table "public"."org_frameworks" add constraint "org_frameworks_pkey" PRIMARY KEY using index "org_frameworks_pkey";

alter table "public"."org_frequencies" add constraint "org_frequencies_pkey" PRIMARY KEY using index "org_frequencies_pkey";

alter table "public"."org_members" add constraint "org_members_pkey" PRIMARY KEY using index "org_members_pkey";

alter table "public"."org_memberships" add constraint "org_memberships_pkey" PRIMARY KEY using index "org_memberships_pkey";

alter table "public"."org_onboarding" add constraint "org_onboarding_pkey" PRIMARY KEY using index "org_onboarding_pkey";

alter table "public"."org_profile_codes" add constraint "org_profile_codes_pkey" PRIMARY KEY using index "org_profile_codes_pkey";

alter table "public"."org_profile_compatibility" add constraint "org_profile_compatibility_pkey" PRIMARY KEY using index "org_profile_compatibility_pkey";

alter table "public"."org_profile_reports" add constraint "org_profile_reports_pkey" PRIMARY KEY using index "org_profile_reports_pkey";

alter table "public"."org_profiles" add constraint "org_profiles_pkey" PRIMARY KEY using index "org_profiles_pkey";

alter table "public"."org_question_options" add constraint "org_question_options_pkey" PRIMARY KEY using index "org_question_options_pkey";

alter table "public"."org_question_weights" add constraint "org_question_weights_pkey" PRIMARY KEY using index "org_question_weights_pkey";

alter table "public"."org_questions" add constraint "org_questions_pkey" PRIMARY KEY using index "org_questions_pkey";

alter table "public"."org_report_drafts" add constraint "org_report_drafts_pkey" PRIMARY KEY using index "org_report_drafts_pkey";

alter table "public"."org_test_answers" add constraint "org_test_answers_pkey" PRIMARY KEY using index "org_test_answers_pkey";

alter table "public"."org_test_defs" add constraint "org_test_defs_pkey" PRIMARY KEY using index "org_test_defs_pkey";

alter table "public"."org_test_questions" add constraint "org_test_questions_pkey" PRIMARY KEY using index "org_test_questions_pkey";

alter table "public"."org_tests" add constraint "org_tests_pkey" PRIMARY KEY using index "org_tests_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."portal_invites" add constraint "portal_invites_pkey" PRIMARY KEY using index "portal_invites_pkey";

alter table "public"."portal_members" add constraint "portal_members_pkey" PRIMARY KEY using index "portal_members_pkey";

alter table "public"."profile_compat" add constraint "profile_compat_pkey" PRIMARY KEY using index "profile_compat_pkey";

alter table "public"."profile_content" add constraint "profile_content_pkey" PRIMARY KEY using index "profile_content_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."profiles_drafts" add constraint "profiles_drafts_pkey" PRIMARY KEY using index "profiles_drafts_pkey";

alter table "public"."report_drafts" add constraint "report_drafts_pkey" PRIMARY KEY using index "report_drafts_pkey";

alter table "public"."report_signoffs" add constraint "report_signoffs_pkey" PRIMARY KEY using index "report_signoffs_pkey";

alter table "public"."report_templates" add constraint "report_templates_pkey" PRIMARY KEY using index "report_templates_pkey";

alter table "public"."template_profile_content" add constraint "template_profile_content_pkey" PRIMARY KEY using index "template_profile_content_pkey";

alter table "public"."template_profiles" add constraint "template_profiles_pkey" PRIMARY KEY using index "template_profiles_pkey";

alter table "public"."template_questions" add constraint "template_questions_pkey" PRIMARY KEY using index "template_questions_pkey";

alter table "public"."template_report_templates" add constraint "template_report_templates_pkey" PRIMARY KEY using index "template_report_templates_pkey";

alter table "public"."templates" add constraint "templates_pkey" PRIMARY KEY using index "templates_pkey";

alter table "public"."test_answers" add constraint "test_answers_pkey" PRIMARY KEY using index "test_answers_pkey";

alter table "public"."test_deployments" add constraint "test_deployments_pkey" PRIMARY KEY using index "test_deployments_pkey";

alter table "public"."test_links" add constraint "test_links_pkey" PRIMARY KEY using index "test_links_pkey";

alter table "public"."test_options" add constraint "test_options_pkey" PRIMARY KEY using index "test_options_pkey";

alter table "public"."test_questions" add constraint "test_questions_pkey" PRIMARY KEY using index "test_questions_pkey";

alter table "public"."test_results" add constraint "test_results_pkey" PRIMARY KEY using index "test_results_pkey";

alter table "public"."test_submissions" add constraint "test_submissions_pkey" PRIMARY KEY using index "test_submissions_pkey";

alter table "public"."test_takers" add constraint "test_takers_pkey" PRIMARY KEY using index "test_takers_pkey";

alter table "public"."tests" add constraint "tests_pkey" PRIMARY KEY using index "tests_pkey";

alter table "portal"."dashboard_scores" add constraint "dashboard_scores_org_id_fkey" FOREIGN KEY (org_id) REFERENCES portal.orgs(id) ON DELETE CASCADE not valid;

alter table "portal"."dashboard_scores" validate constraint "dashboard_scores_org_id_fkey";

alter table "portal"."dashboard_scores" add constraint "dashboard_scores_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES portal.test_submissions(id) ON DELETE CASCADE not valid;

alter table "portal"."dashboard_scores" validate constraint "dashboard_scores_submission_id_fkey";

alter table "portal"."dashboard_scores" add constraint "dashboard_scores_taker_id_fkey" FOREIGN KEY (taker_id) REFERENCES portal.test_takers(id) ON DELETE CASCADE not valid;

alter table "portal"."dashboard_scores" validate constraint "dashboard_scores_taker_id_fkey";

alter table "portal"."dashboard_scores" add constraint "dashboard_scores_test_id_fkey" FOREIGN KEY (test_id) REFERENCES portal.tests(id) ON DELETE CASCADE not valid;

alter table "portal"."dashboard_scores" validate constraint "dashboard_scores_test_id_fkey";

alter table "portal"."dashboard_scores" add constraint "uq_dashboard_scores_submission_profile" UNIQUE using index "uq_dashboard_scores_submission_profile";

alter table "portal"."orgs" add constraint "orgs_slug_key" UNIQUE using index "orgs_slug_key";

alter table "portal"."test_answers" add constraint "test_answers_choice_check" CHECK (((choice >= 1) AND (choice <= 5))) not valid;

alter table "portal"."test_answers" validate constraint "test_answers_choice_check";

alter table "portal"."test_links" add constraint "fk_test_links_org" FOREIGN KEY (org_id) REFERENCES portal.orgs(id) ON DELETE CASCADE not valid;

alter table "portal"."test_links" validate constraint "fk_test_links_org";

alter table "portal"."test_links" add constraint "test_links_test_id_fkey" FOREIGN KEY (test_id) REFERENCES portal.tests(id) ON DELETE CASCADE not valid;

alter table "portal"."test_links" validate constraint "test_links_test_id_fkey";

alter table "portal"."test_links" add constraint "test_links_token_key" UNIQUE using index "test_links_token_key";

alter table "portal"."test_questions" add constraint "test_questions_test_id_fkey" FOREIGN KEY (test_id) REFERENCES portal.tests(id) ON DELETE CASCADE not valid;

alter table "portal"."test_questions" validate constraint "test_questions_test_id_fkey";

alter table "portal"."test_results" add constraint "test_results_taker_id_key" UNIQUE using index "test_results_taker_id_key";

alter table "portal"."test_submissions" add constraint "test_submissions_taker_id_fkey" FOREIGN KEY (taker_id) REFERENCES portal.test_takers(id) ON DELETE CASCADE not valid;

alter table "portal"."test_submissions" validate constraint "test_submissions_taker_id_fkey";

alter table "portal"."test_submissions" add constraint "test_submissions_test_id_fkey" FOREIGN KEY (test_id) REFERENCES portal.tests(id) ON DELETE CASCADE not valid;

alter table "portal"."test_submissions" validate constraint "test_submissions_test_id_fkey";

alter table "portal"."test_takers" add constraint "test_takers_link_token_fkey" FOREIGN KEY (link_token) REFERENCES portal.test_links(token) ON DELETE RESTRICT not valid;

alter table "portal"."test_takers" validate constraint "test_takers_link_token_fkey";

alter table "portal"."test_takers" add constraint "test_takers_org_id_fkey" FOREIGN KEY (org_id) REFERENCES portal.orgs(id) ON DELETE CASCADE not valid;

alter table "portal"."test_takers" validate constraint "test_takers_org_id_fkey";

alter table "portal"."test_takers" add constraint "test_takers_test_id_fkey" FOREIGN KEY (test_id) REFERENCES portal.tests(id) ON DELETE CASCADE not valid;

alter table "portal"."test_takers" validate constraint "test_takers_test_id_fkey";

alter table "portal"."tests" add constraint "tests_org_id_fkey" FOREIGN KEY (org_id) REFERENCES portal.orgs(id) ON DELETE CASCADE not valid;

alter table "portal"."tests" validate constraint "tests_org_id_fkey";

alter table "portal"."tests" add constraint "tests_slug_key" UNIQUE using index "tests_slug_key";

alter table "portal"."tests" add constraint "uq_tests_org_slug" UNIQUE using index "uq_tests_org_slug";

alter table "public"."base_options" add constraint "base_options_frequency_check" CHECK ((frequency = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]))) not valid;

alter table "public"."base_options" validate constraint "base_options_frequency_check";

alter table "public"."base_options" add constraint "base_options_points_check" CHECK ((points = ANY (ARRAY[10, 20, 30, 40]))) not valid;

alter table "public"."base_options" validate constraint "base_options_points_check";

alter table "public"."base_options" add constraint "base_options_profile_index_check" CHECK (((profile_index >= 1) AND (profile_index <= 8))) not valid;

alter table "public"."base_options" validate constraint "base_options_profile_index_check";

alter table "public"."base_options" add constraint "base_options_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.base_questions(id) ON DELETE CASCADE not valid;

alter table "public"."base_options" validate constraint "base_options_question_id_fkey";

alter table "public"."base_options" add constraint "base_options_question_id_onum_key" UNIQUE using index "base_options_question_id_onum_key";

alter table "public"."base_questions" add constraint "base_questions_qnum_key" UNIQUE using index "base_questions_qnum_key";

alter table "public"."brand_settings" add constraint "brand_settings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."brand_settings" validate constraint "brand_settings_org_id_fkey";

alter table "public"."framework_settings" add constraint "framework_settings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."framework_settings" validate constraint "framework_settings_org_id_fkey";

alter table "public"."org_brand_settings" add constraint "org_brand_settings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_brand_settings" validate constraint "org_brand_settings_org_id_fkey";

alter table "public"."org_frameworks" add constraint "org_frameworks_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_frameworks" validate constraint "org_frameworks_org_id_fkey";

alter table "public"."org_frequencies" add constraint "org_frequencies_code_check" CHECK ((code = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]))) not valid;

alter table "public"."org_frequencies" validate constraint "org_frequencies_code_check";

alter table "public"."org_frequencies" add constraint "org_frequencies_framework_id_fkey" FOREIGN KEY (framework_id) REFERENCES public.org_frameworks(id) ON DELETE CASCADE not valid;

alter table "public"."org_frequencies" validate constraint "org_frequencies_framework_id_fkey";

alter table "public"."org_members" add constraint "org_members_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_members" validate constraint "org_members_org_id_fkey";

alter table "public"."org_members" add constraint "org_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'viewer'::text]))) not valid;

alter table "public"."org_members" validate constraint "org_members_role_check";

alter table "public"."org_members" add constraint "org_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."org_members" validate constraint "org_members_user_id_fkey";

alter table "public"."org_memberships" add constraint "org_memberships_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_memberships" validate constraint "org_memberships_org_id_fkey";

alter table "public"."org_profile_codes" add constraint "org_profile_codes_org_id_code_key" UNIQUE using index "org_profile_codes_org_id_code_key";

alter table "public"."org_profile_codes" add constraint "org_profile_codes_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_profile_codes" validate constraint "org_profile_codes_org_id_fkey";

alter table "public"."org_profile_compatibility" add constraint "org_profile_compatibility_framework_id_fkey" FOREIGN KEY (framework_id) REFERENCES public.org_frameworks(id) ON DELETE CASCADE not valid;

alter table "public"."org_profile_compatibility" validate constraint "org_profile_compatibility_framework_id_fkey";

alter table "public"."org_profile_compatibility" add constraint "org_profile_compatibility_framework_id_profile_a_id_profile_key" UNIQUE using index "org_profile_compatibility_framework_id_profile_a_id_profile_key";

alter table "public"."org_profile_compatibility" add constraint "org_profile_compatibility_profile_a_id_fkey" FOREIGN KEY (profile_a_id) REFERENCES public.org_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."org_profile_compatibility" validate constraint "org_profile_compatibility_profile_a_id_fkey";

alter table "public"."org_profile_compatibility" add constraint "org_profile_compatibility_profile_b_id_fkey" FOREIGN KEY (profile_b_id) REFERENCES public.org_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."org_profile_compatibility" validate constraint "org_profile_compatibility_profile_b_id_fkey";

alter table "public"."org_profile_compatibility" add constraint "org_profile_compatibility_score_check" CHECK (((score >= '-100'::integer) AND (score <= 100))) not valid;

alter table "public"."org_profile_compatibility" validate constraint "org_profile_compatibility_score_check";

alter table "public"."org_profile_reports" add constraint "org_profile_reports_framework_id_fkey" FOREIGN KEY (framework_id) REFERENCES public.org_frameworks(id) ON DELETE CASCADE not valid;

alter table "public"."org_profile_reports" validate constraint "org_profile_reports_framework_id_fkey";

alter table "public"."org_profile_reports" add constraint "org_profile_reports_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_profile_reports" validate constraint "org_profile_reports_org_id_fkey";

alter table "public"."org_profile_reports" add constraint "org_profile_reports_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.org_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."org_profile_reports" validate constraint "org_profile_reports_profile_id_fkey";

alter table "public"."org_profile_reports" add constraint "org_profile_reports_profile_id_key" UNIQUE using index "org_profile_reports_profile_id_key";

alter table "public"."org_profiles" add constraint "org_profiles_framework_id_fkey" FOREIGN KEY (framework_id) REFERENCES public.org_frameworks(id) ON DELETE CASCADE not valid;

alter table "public"."org_profiles" validate constraint "org_profiles_framework_id_fkey";

alter table "public"."org_profiles" add constraint "org_profiles_frequency_chk" CHECK ((frequency = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]))) not valid;

alter table "public"."org_profiles" validate constraint "org_profiles_frequency_chk";

alter table "public"."org_profiles" add constraint "org_profiles_org_id_code_key" UNIQUE using index "org_profiles_org_id_code_key";

alter table "public"."org_profiles" add constraint "org_profiles_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_profiles" validate constraint "org_profiles_org_id_fkey";

alter table "public"."org_question_options" add constraint "org_question_options_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.org_questions(id) ON DELETE CASCADE not valid;

alter table "public"."org_question_options" validate constraint "org_question_options_question_id_fkey";

alter table "public"."org_question_weights" add constraint "org_question_weights_freq_check" CHECK ((freq = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]))) not valid;

alter table "public"."org_question_weights" validate constraint "org_question_weights_freq_check";

alter table "public"."org_question_weights" add constraint "org_question_weights_option_id_fkey" FOREIGN KEY (option_id) REFERENCES public.org_question_options(id) ON DELETE CASCADE not valid;

alter table "public"."org_question_weights" validate constraint "org_question_weights_option_id_fkey";

alter table "public"."org_question_weights" add constraint "org_question_weights_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.org_questions(id) ON DELETE CASCADE not valid;

alter table "public"."org_question_weights" validate constraint "org_question_weights_question_id_fkey";

alter table "public"."org_questions" add constraint "org_questions_framework_id_fkey" FOREIGN KEY (framework_id) REFERENCES public.org_frameworks(id) ON DELETE SET NULL not valid;

alter table "public"."org_questions" validate constraint "org_questions_framework_id_fkey";

alter table "public"."org_questions" add constraint "org_questions_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_questions" validate constraint "org_questions_org_id_fkey";

alter table "public"."org_report_drafts" add constraint "org_report_drafts_framework_id_fkey" FOREIGN KEY (framework_id) REFERENCES public.org_frameworks(id) ON DELETE CASCADE not valid;

alter table "public"."org_report_drafts" validate constraint "org_report_drafts_framework_id_fkey";

alter table "public"."org_report_drafts" add constraint "org_report_drafts_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_report_drafts" validate constraint "org_report_drafts_org_id_fkey";

alter table "public"."org_test_answers" add constraint "org_test_answers_frequency_chk" CHECK ((frequency = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]))) not valid;

alter table "public"."org_test_answers" validate constraint "org_test_answers_frequency_chk";

alter table "public"."org_test_answers" add constraint "org_test_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.org_test_questions(id) ON DELETE CASCADE not valid;

alter table "public"."org_test_answers" validate constraint "org_test_answers_question_id_fkey";

alter table "public"."org_test_defs" add constraint "org_test_defs_framework_id_fkey" FOREIGN KEY (framework_id) REFERENCES public.org_frameworks(id) not valid;

alter table "public"."org_test_defs" validate constraint "org_test_defs_framework_id_fkey";

alter table "public"."org_test_defs" add constraint "org_test_defs_mode_check" CHECK ((mode = ANY (ARRAY['free'::text, 'full'::text]))) not valid;

alter table "public"."org_test_defs" validate constraint "org_test_defs_mode_check";

alter table "public"."org_test_defs" add constraint "org_test_defs_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) not valid;

alter table "public"."org_test_defs" validate constraint "org_test_defs_org_id_fkey";

alter table "public"."org_test_questions" add constraint "org_test_questions_source_check" CHECK ((source = ANY (ARRAY['base'::text, 'custom'::text]))) not valid;

alter table "public"."org_test_questions" validate constraint "org_test_questions_source_check";

alter table "public"."org_test_questions" add constraint "org_test_questions_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.org_test_defs(id) ON DELETE CASCADE not valid;

alter table "public"."org_test_questions" validate constraint "org_test_questions_test_id_fkey";

alter table "public"."org_tests" add constraint "org_tests_mode_check" CHECK ((mode = ANY (ARRAY['free'::text, 'full'::text]))) not valid;

alter table "public"."org_tests" validate constraint "org_tests_mode_check";

alter table "public"."org_tests" add constraint "org_tests_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_tests" validate constraint "org_tests_org_id_fkey";

alter table "public"."org_tests" add constraint "org_tests_org_id_slug_key" UNIQUE using index "org_tests_org_id_slug_key";

alter table "public"."organizations" add constraint "organizations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."organizations" validate constraint "organizations_created_by_fkey";

alter table "public"."organizations" add constraint "organizations_owner_user_fk" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."organizations" validate constraint "organizations_owner_user_fk";

alter table "public"."organizations" add constraint "organizations_slug_key" UNIQUE using index "organizations_slug_key";

alter table "public"."portal_invites" add constraint "portal_invites_org_id_email_key" UNIQUE using index "portal_invites_org_id_email_key";

alter table "public"."portal_invites" add constraint "portal_invites_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."portal_invites" validate constraint "portal_invites_org_id_fkey";

alter table "public"."portal_invites" add constraint "portal_invites_role_check" CHECK ((role = ANY (ARRAY['client'::text, 'manager'::text, 'viewer'::text]))) not valid;

alter table "public"."portal_invites" validate constraint "portal_invites_role_check";

alter table "public"."portal_invites" add constraint "portal_invites_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text]))) not valid;

alter table "public"."portal_invites" validate constraint "portal_invites_status_check";

alter table "public"."portal_members" add constraint "portal_members_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."portal_members" validate constraint "portal_members_org_id_fkey";

alter table "public"."portal_members" add constraint "portal_members_role_check" CHECK ((role = ANY (ARRAY['client'::text, 'manager'::text, 'viewer'::text]))) not valid;

alter table "public"."portal_members" validate constraint "portal_members_role_check";

alter table "public"."portal_members" add constraint "portal_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."portal_members" validate constraint "portal_members_user_id_fkey";

alter table "public"."profile_compat" add constraint "profile_compat_check" CHECK (((a_key ~ '^[ABCD][12]$'::text) AND (b_key ~ '^[ABCD][12]$'::text))) not valid;

alter table "public"."profile_compat" validate constraint "profile_compat_check";

alter table "public"."profile_compat" add constraint "profile_compat_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."profile_compat" validate constraint "profile_compat_org_id_fkey";

alter table "public"."profile_content" add constraint "profile_content_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."profile_content" validate constraint "profile_content_org_id_fkey";

alter table "public"."profiles" add constraint "fk_profiles_framework" FOREIGN KEY (framework_key) REFERENCES public.frameworks(key) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "fk_profiles_framework";

alter table "public"."profiles" add constraint "profiles_freq_key_check" CHECK ((freq_key = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_freq_key_check";

alter table "public"."profiles" add constraint "profiles_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_org_id_fkey";

alter table "public"."profiles" add constraint "profiles_org_id_key_key" UNIQUE using index "profiles_org_id_key_key";

alter table "public"."profiles_drafts" add constraint "profiles_drafts_frequency_check" CHECK ((frequency = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]))) not valid;

alter table "public"."profiles_drafts" validate constraint "profiles_drafts_frequency_check";

alter table "public"."profiles_drafts" add constraint "profiles_drafts_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."profiles_drafts" validate constraint "profiles_drafts_org_id_fkey";

alter table "public"."report_drafts" add constraint "report_drafts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."report_drafts" validate constraint "report_drafts_created_by_fkey";

alter table "public"."report_drafts" add constraint "report_drafts_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."report_drafts" validate constraint "report_drafts_org_id_fkey";

alter table "public"."report_drafts" add constraint "report_drafts_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.org_tests(id) ON DELETE CASCADE not valid;

alter table "public"."report_drafts" validate constraint "report_drafts_test_id_fkey";

alter table "public"."report_signoffs" add constraint "report_signoffs_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."report_signoffs" validate constraint "report_signoffs_org_id_fkey";

alter table "public"."report_signoffs" add constraint "report_signoffs_signed_by_fkey" FOREIGN KEY (signed_by) REFERENCES auth.users(id) not valid;

alter table "public"."report_signoffs" validate constraint "report_signoffs_signed_by_fkey";

alter table "public"."report_signoffs" add constraint "report_signoffs_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.org_tests(id) ON DELETE CASCADE not valid;

alter table "public"."report_signoffs" validate constraint "report_signoffs_test_id_fkey";

alter table "public"."report_templates" add constraint "report_templates_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."report_templates" validate constraint "report_templates_org_id_fkey";

alter table "public"."template_profile_content" add constraint "template_profile_content_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE not valid;

alter table "public"."template_profile_content" validate constraint "template_profile_content_template_id_fkey";

alter table "public"."template_profiles" add constraint "template_profiles_freq_key_check" CHECK ((freq_key = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]))) not valid;

alter table "public"."template_profiles" validate constraint "template_profiles_freq_key_check";

alter table "public"."template_profiles" add constraint "template_profiles_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE not valid;

alter table "public"."template_profiles" validate constraint "template_profiles_template_id_fkey";

alter table "public"."template_questions" add constraint "template_questions_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE not valid;

alter table "public"."template_questions" validate constraint "template_questions_template_id_fkey";

alter table "public"."template_questions" add constraint "template_questions_type_check" CHECK ((type = ANY (ARRAY['text'::text, 'scale5'::text]))) not valid;

alter table "public"."template_questions" validate constraint "template_questions_type_check";

alter table "public"."template_report_templates" add constraint "template_report_templates_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE not valid;

alter table "public"."template_report_templates" validate constraint "template_report_templates_template_id_fkey";

alter table "public"."templates" add constraint "templates_key_key" UNIQUE using index "templates_key_key";

alter table "public"."test_answers" add constraint "test_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.test_questions(id) ON DELETE CASCADE not valid;

alter table "public"."test_answers" validate constraint "test_answers_question_id_fkey";

alter table "public"."test_answers" add constraint "test_answers_taker_id_fkey" FOREIGN KEY (taker_id) REFERENCES public.test_takers(id) ON DELETE CASCADE not valid;

alter table "public"."test_answers" validate constraint "test_answers_taker_id_fkey";

alter table "public"."test_answers" add constraint "test_answers_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE not valid;

alter table "public"."test_answers" validate constraint "test_answers_test_id_fkey";

alter table "public"."test_deployments" add constraint "test_deployments_slug_key" UNIQUE using index "test_deployments_slug_key";

alter table "public"."test_links" add constraint "test_links_mode_check" CHECK ((mode = ANY (ARRAY['free'::text, 'full'::text]))) not valid;

alter table "public"."test_links" validate constraint "test_links_mode_check";

alter table "public"."test_links" add constraint "test_links_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."test_links" validate constraint "test_links_org_id_fkey";

alter table "public"."test_links" add constraint "test_links_taker_id_fkey" FOREIGN KEY (taker_id) REFERENCES public.test_takers(id) ON DELETE SET NULL not valid;

alter table "public"."test_links" validate constraint "test_links_taker_id_fkey";

alter table "public"."test_links" add constraint "test_links_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.org_tests(id) ON DELETE CASCADE not valid;

alter table "public"."test_links" validate constraint "test_links_test_id_fkey";

alter table "public"."test_links" add constraint "test_links_token_key" UNIQUE using index "test_links_token_key";

alter table "public"."test_options" add constraint "test_options_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."test_options" validate constraint "test_options_org_id_fkey";

alter table "public"."test_options" add constraint "test_options_question_id_code_key" UNIQUE using index "test_options_question_id_code_key";

alter table "public"."test_options" add constraint "test_options_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.test_questions(id) ON DELETE CASCADE not valid;

alter table "public"."test_options" validate constraint "test_options_question_id_fkey";

alter table "public"."test_options" add constraint "test_options_question_id_idx_key" UNIQUE using index "test_options_question_id_idx_key";

alter table "public"."test_questions" add constraint "test_questions_kind_check" CHECK ((kind = ANY (ARRAY['base'::text, 'segment'::text]))) not valid;

alter table "public"."test_questions" validate constraint "test_questions_kind_check";

alter table "public"."test_questions" add constraint "test_questions_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."test_questions" validate constraint "test_questions_org_id_fkey";

alter table "public"."test_questions" add constraint "test_questions_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.org_tests(id) ON DELETE CASCADE not valid;

alter table "public"."test_questions" validate constraint "test_questions_test_id_fkey";

alter table "public"."test_questions" add constraint "test_questions_test_id_idx_key" UNIQUE using index "test_questions_test_id_idx_key";

alter table "public"."test_questions" add constraint "test_questions_test_id_order_key" UNIQUE using index "test_questions_test_id_order_key";

alter table "public"."test_results" add constraint "test_results_taker_id_fkey" FOREIGN KEY (taker_id) REFERENCES public.test_takers(id) ON DELETE CASCADE not valid;

alter table "public"."test_results" validate constraint "test_results_taker_id_fkey";

alter table "public"."test_results" add constraint "test_results_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE not valid;

alter table "public"."test_results" validate constraint "test_results_test_id_fkey";

alter table "public"."test_submissions" add constraint "test_submissions_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."test_submissions" validate constraint "test_submissions_org_id_fkey";

alter table "public"."test_submissions" add constraint "test_submissions_taker_id_fkey" FOREIGN KEY (taker_id) REFERENCES public.test_takers(id) ON DELETE CASCADE not valid;

alter table "public"."test_submissions" validate constraint "test_submissions_taker_id_fkey";

alter table "public"."test_submissions" add constraint "test_submissions_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.org_tests(id) ON DELETE CASCADE not valid;

alter table "public"."test_submissions" validate constraint "test_submissions_test_id_fkey";

alter table "public"."test_takers" add constraint "test_takers_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."test_takers" validate constraint "test_takers_org_id_fkey";

alter table "public"."test_takers" add constraint "test_takers_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.org_tests(id) ON DELETE CASCADE not valid;

alter table "public"."test_takers" validate constraint "test_takers_test_id_fkey";

alter table "public"."tests" add constraint "tests_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."tests" validate constraint "tests_org_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION portal.compute_and_upsert_totals(p_taker uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_test_id uuid;
  v_token   text;
  v_totals  jsonb := '{"A":0,"B":0,"C":0,"D":0}';
begin
  -- Resolve test & token from taker
  select t.test_id, t.link_token into v_test_id, v_token
  from portal.test_takers t
  where t.id = p_taker;

  if v_test_id is null then
    raise exception 'Unknown taker_id: %', p_taker;
  end if;

  /*
    Sum points per frequency A/B/C/D using each question’s profile_map.
    For Team Puzzle this exists already.
    For Competency Coach: if profile_map is missing we’ll return zeroes
    (then we know to seed weights properly).
  */
  with ans as (
    select s.taker_id,
           (a->>'question_id')::uuid as qid,
           (a->>'value')::int       as choice_idx
    from portal.test_submissions s,
         lateral jsonb_array_elements(coalesce(s.answers_json, '[]'::jsonb)) a
    where s.taker_id = p_taker
  ),
  q as (
    select id, profile_map
    from portal.test_questions
    where test_id = v_test_id
  ),
  joined as (
    select
      a.choice_idx,
      (q.profile_map -> (a.choice_idx - 1)) as pm -- pm: {"points":40,"profile":"PROFILE_1","frequency":"A"}
    from ans a
    join q on q.id = a.qid
    where a.choice_idx between 1 and 8 -- defensive upper bound
  ),
  freq_sum as (
    select
      coalesce(upper(pm->>'frequency'),'') as freq,
      sum( coalesce( (pm->>'points')::int, 0) ) as pts
    from joined
    where pm is not null
    group by 1
  )
  select jsonb_build_object(
           'A', coalesce( (select pts from freq_sum where freq='A'), 0),
           'B', coalesce( (select pts from freq_sum where freq='B'), 0),
           'C', coalesce( (select pts from freq_sum where freq='C'), 0),
           'D', coalesce( (select pts from freq_sum where freq='D'), 0)
         )
  into v_totals;

  -- Persist so pages can read quickly
  insert into portal.test_results (taker_id, totals)
  values (p_taker, v_totals)
  on conflict (taker_id) do update set totals = excluded.totals;

  return v_totals;
end;
$function$
;

CREATE OR REPLACE FUNCTION portal.gen_token(len integer DEFAULT 12)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select replace(replace(replace(encode(gen_random_bytes(len), 'base64'), '/', ''), '+', ''), '=', '');
$function$
;

create or replace view "portal"."v_dashboard_avg_frequency" as  SELECT org_id,
    org_slug,
    test_id,
    frequency_code,
    frequency_name,
    (avg(points))::numeric(12,2) AS avg_points
   FROM portal.dashboard_scores
  GROUP BY org_id, org_slug, test_id, frequency_code, frequency_name;


create or replace view "portal"."v_dashboard_avg_profile" as  SELECT org_id,
    org_slug,
    test_id,
    profile_code,
    profile_name,
    (avg(points))::numeric(12,2) AS avg_points
   FROM portal.dashboard_scores
  GROUP BY org_id, org_slug, test_id, profile_code, profile_name;


create or replace view "portal"."v_dashboard_bottom3_profiles" as  WITH ranked AS (
         SELECT dashboard_scores.org_id,
            dashboard_scores.org_slug,
            dashboard_scores.test_id,
            dashboard_scores.profile_code,
            dashboard_scores.profile_name,
            (avg(dashboard_scores.points))::numeric(12,2) AS avg_points,
            dense_rank() OVER (PARTITION BY dashboard_scores.org_id, dashboard_scores.test_id ORDER BY (avg(dashboard_scores.points))) AS rnk
           FROM portal.dashboard_scores
          GROUP BY dashboard_scores.org_id, dashboard_scores.org_slug, dashboard_scores.test_id, dashboard_scores.profile_code, dashboard_scores.profile_name
        )
 SELECT org_id,
    org_slug,
    test_id,
    profile_code,
    profile_name,
    avg_points,
    rnk
   FROM ranked
  WHERE (rnk <= 3);


create or replace view "portal"."v_dashboard_overall_avg" as  SELECT org_id,
    org_slug,
    test_id,
    (avg(avg_points))::numeric(12,2) AS overall_avg
   FROM portal.v_dashboard_avg_profile
  GROUP BY org_id, org_slug, test_id;


create or replace view "portal"."v_dashboard_top3_profiles" as  WITH ranked AS (
         SELECT dashboard_scores.org_id,
            dashboard_scores.org_slug,
            dashboard_scores.test_id,
            dashboard_scores.profile_code,
            dashboard_scores.profile_name,
            (avg(dashboard_scores.points))::numeric(12,2) AS avg_points,
            dense_rank() OVER (PARTITION BY dashboard_scores.org_id, dashboard_scores.test_id ORDER BY (avg(dashboard_scores.points)) DESC) AS rnk
           FROM portal.dashboard_scores
          GROUP BY dashboard_scores.org_id, dashboard_scores.org_slug, dashboard_scores.test_id, dashboard_scores.profile_code, dashboard_scores.profile_name
        )
 SELECT org_id,
    org_slug,
    test_id,
    profile_code,
    profile_name,
    avg_points,
    rnk
   FROM ranked
  WHERE (rnk <= 3);


create or replace view "portal"."v_org_tests" as  SELECT t.id AS test_id,
    t.org_id,
    o.slug AS org_slug,
    t.name AS test_name,
    t.created_at
   FROM (portal.tests t
     JOIN portal.orgs o ON ((o.id = t.org_id)));


create or replace view "portal"."v_organizations" as  SELECT id,
    slug,
    name,
    created_at
   FROM portal.orgs;


create or replace view "portal"."v_submission_scores_expanded" as  SELECT s.id AS submission_id,
    v.org_id,
    v.org_slug,
    s.test_id,
    s.taker_id,
    p.profile_code,
    p.profile_name,
    f.frequency_code,
    f.frequency_name,
    (t.value)::numeric AS points,
    s.created_at
   FROM ((((portal.test_submissions s
     JOIN LATERAL jsonb_each_text(s.totals) t(key, value) ON (true))
     JOIN portal.test_profile_labels p ON (((p.test_id = s.test_id) AND (p.profile_code = t.key))))
     LEFT JOIN portal.test_frequency_labels f ON (((f.test_id = p.test_id) AND (f.frequency_code = p.frequency_code))))
     JOIN portal.v_org_tests v ON ((v.test_id = s.test_id)));


create or replace view "portal"."v_taker_frequency_scores" as  SELECT org_id,
    org_slug,
    test_id,
    taker_id,
    frequency_code,
    frequency_name,
    (sum(points))::numeric(12,2) AS total_points
   FROM portal.dashboard_scores
  GROUP BY org_id, org_slug, test_id, taker_id, frequency_code, frequency_name;


create or replace view "portal"."v_taker_profile_scores" as  SELECT org_id,
    org_slug,
    test_id,
    taker_id,
    profile_code,
    profile_name,
    (sum(points))::numeric(12,2) AS total_points
   FROM portal.dashboard_scores
  GROUP BY org_id, org_slug, test_id, taker_id, profile_code, profile_name;


create or replace view "portal"."v_test_links" as  SELECT id,
    org_id,
    test_id,
    token,
    use_count,
    max_uses,
    created_at
   FROM portal.test_links l;


create or replace view "portal"."v_test_takers" as  SELECT tt.id AS taker_id,
    tt.org_id,
    o.slug AS org_slug,
    tt.test_id,
    t.name AS test_name,
    tt.email,
    tt.first_name,
    tt.last_name,
    tt.created_at AS taken_at
   FROM ((portal.test_takers tt
     JOIN portal.tests t ON ((t.id = tt.test_id)))
     JOIN portal.orgs o ON ((o.id = tt.org_id)));


CREATE OR REPLACE FUNCTION public.create_org_and_owner(p_name text, p_slug text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (coalesce(p_name, 'My Organization'), p_slug, v_uid)
  returning id into v_org;

  insert into public.org_members (org_id, user_id, role)
  values (v_org, v_uid, 'owner')
  on conflict do nothing;

  return v_org;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_test_link_by_id(p_org_slug text, p_test_id uuid, p_kind text DEFAULT 'full'::text, p_max_uses integer DEFAULT 1, p_ttl_days integer DEFAULT 30)
 RETURNS TABLE(link_id uuid, org_id uuid, test_id uuid, token text, kind text, max_uses integer, uses integer, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_org_id   uuid;
  v_token    text;
  v_exp      timestamptz := now() + (p_ttl_days || ' days')::interval;
  v_belongs  boolean := false;
begin
  -- Resolve org
  select o.id into v_org_id
  from public.organizations o
  where o.slug = p_org_slug
  limit 1;

  if v_org_id is null then
    raise exception 'Organization not found for slug=%', p_org_slug using errcode='P0001';
  end if;

  -- Confirm the test belongs to this org (org_tests preferred)
  select exists (
    select 1
    from public.org_tests t
    where t.id = p_test_id
      and t.org_id = v_org_id
  ) into v_belongs;

  -- Fallback: legacy tests (only if table exists)
  if not v_belongs and exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='tests'
  ) then
    select exists (
      select 1
      from public.tests t
      where t.id = p_test_id
        and t.org_id = v_org_id
    ) into v_belongs;
  end if;

  if not v_belongs then
    raise exception 'Test % does not belong to org %', p_test_id, p_org_slug using errcode='P0001';
  end if;

  -- Token
  v_token := substr(p_org_slug, 1, 2)
             || to_char(extract(epoch from now())::bigint, 'FM999999999999999')
             || '-' || encode(gen_random_bytes(4), 'hex');

  -- Insert the link
  insert into public.test_links (org_id, test_id, token, kind, max_uses, uses, expires_at)
  values (v_org_id, p_test_id, v_token, coalesce(p_kind,'full'), coalesce(p_max_uses,1), 0, v_exp)
  returning id, org_id, test_id, token, kind, max_uses, uses, expires_at
  into link_id, org_id, test_id, token, kind, max_uses, uses, expires_at;

  return next;
end $function$
;

CREATE OR REPLACE FUNCTION public.create_test_link_by_slug(p_org_slug text, p_test_key text, p_kind text DEFAULT 'full'::text, p_max_uses integer DEFAULT 1, p_ttl_days integer DEFAULT 30)
 RETURNS TABLE(link_id uuid, org_id uuid, test_id uuid, token text, kind text, max_uses integer, uses integer, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_org_id uuid;
  v_test_id uuid;
  v_token text;
  v_exp timestamptz := now() + (p_ttl_days || ' days')::interval;
  v_has_legacy boolean;
  v_legacy_has_slug boolean;
begin
  -- 1) Resolve org
  select o.id into v_org_id
  from public.organizations o
  where o.slug = p_org_slug
  limit 1;

  if v_org_id is null then
    raise exception 'Organization not found for slug=%', p_org_slug using errcode='P0001';
  end if;

  -- 2) Try org_tests first (slug or name)
  select t.id into v_test_id
  from public.org_tests t
  where t.org_id = v_org_id
    and (t.slug = p_test_key or t.name = p_test_key)
  limit 1;

  -- 3) Fallback: legacy tests, detect presence and structure
  if v_test_id is null then
    select exists (
      select 1 from information_schema.tables
      where table_schema='public' and table_name='tests'
    ) into v_has_legacy;

    if v_has_legacy then
      select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='tests' and column_name='slug'
      ) into v_legacy_has_slug;

      if v_legacy_has_slug then
        -- legacy tests has slug: match slug OR name
        select t.id into v_test_id
        from public.tests t
        where t.org_id = v_org_id
          and (t.slug = p_test_key or t.name = p_test_key)
        limit 1;
      else
        -- legacy tests has NO slug: match by name only
        select t.id into v_test_id
        from public.tests t
        where t.org_id = v_org_id
          and t.name = p_test_key
        limit 1;
      end if;
    end if;
  end if;

  if v_test_id is null then
    raise exception 'Test not found in org %, looked for key=% (slug or name)', p_org_slug, p_test_key using errcode='P0001';
  end if;

  -- 4) Generate token
  v_token := substr(p_org_slug, 1, 2)
             || to_char(extract(epoch from now())::bigint, 'FM999999999999999')
             || '-' || encode(gen_random_bytes(4), 'hex');

  -- 5) Insert link
  insert into public.test_links (org_id, test_id, token, kind, max_uses, uses, expires_at)
  values (v_org_id, v_test_id, v_token, coalesce(p_kind, 'full'), coalesce(p_max_uses, 1), 0, v_exp)
  returning id, org_id, test_id, token, kind, max_uses, uses, expires_at
  into link_id, org_id, test_id, token, kind, max_uses, uses, expires_at;

  return next;
end $function$
;

CREATE OR REPLACE FUNCTION public.is_member(target_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target_org_id and m.user_id = auth.uid()
  )
  or exists (
    select 1 from public.portal_members pm
    where pm.org_id = target_org_id and pm.user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.mc_get_profiles_with_approved(p_org_id uuid, p_fw_id uuid)
 RETURNS TABLE(id uuid, name text, frequency text, ordinal integer, approved boolean)
 LANGUAGE sql
AS $function$
  select p.id, p.name, p.frequency, p.ordinal, coalesce(r.approved, false) as approved
  from org_profiles p
  left join org_profile_reports r
    on r.org_id = p.org_id and r.framework_id = p.framework_id and r.profile_id = p.id
  where p.org_id = p_org_id and p.framework_id = p_fw_id
  order by p.ordinal nulls last;
$function$
;

CREATE OR REPLACE FUNCTION public.member_of_row(row_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_member(row_org_id);
$function$
;

CREATE OR REPLACE FUNCTION public.org_id_from_auth()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.org_id
  from public.org_members m
  where m.user_id = auth.uid()
  order by m.created_at asc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.org_owner(p_org_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
declare
  owner_uuid uuid;
  col text;
begin
  -- Detect which owner column exists on "organizations"
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='organizations' and column_name='owner_user_id'
  ) then
    col := 'owner_user_id';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='organizations' and column_name='user_id'
  ) then
    col := 'user_id';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='organizations' and column_name='created_by'
  ) then
    col := 'created_by';
  else
    -- No recognizable owner column; return NULL
    return null;
  end if;

  execute format('select %I from organizations where id = $1', col)
    into owner_uuid
    using p_org_id;

  return owner_uuid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.organizations_autofill()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if new.owner_user_id is null then
    new.owner_user_id := auth.uid();
  end if;

  if (new.slug is null or length(new.slug) = 0) and new.name is not null then
    new.slug := slugify(new.name);
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.seed_base_questions(p_org_slug text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_org uuid;
  v_fw  uuid;
begin
  select org_id, framework_id
    into v_org, v_fw
  from get_org_and_framework(p_org_slug);

  if v_org is null then
    raise exception 'No org/framework found for slug %', p_org_slug;
  end if;

  -- Optional: clear any previous set for this org/framework
  delete from org_questions
   where org_id = v_org
     and framework_id = v_fw;

  -- Insert all 15 using one INSERT ... SELECT from a VALUES set
  insert into org_questions (org_id, framework_id, question_no, prompt, options, weights)
  select
    v_org,
    v_fw,
    qn,
    prompt,
    opts::jsonb,
    wts::jsonb
  from (
    values
    -- 1
    (1, 'How do you prefer to tackle new tasks?',
     '["I dive right in","I make a detailed plan","I like to brainstorm with others","I follow a structured process"]',
     '[{"points":40,"profile":1,"frequency":"A"},
       {"points":10,"profile":7,"frequency":"D"},
       {"points":30,"profile":4,"frequency":"B"},
       {"points":20,"profile":6,"frequency":"C"}]'),
    -- 2
    (2, 'Which statement describes you best in a team setting?',
     '["I take charge and lead","Keep tasks on track","Build positive environment","Focus on details"]',
     '[{"points":40,"profile":8,"frequency":"A"},
       {"points":20,"profile":6,"frequency":"C"},
       {"points":30,"profile":3,"frequency":"B"},
       {"points":10,"profile":7,"frequency":"D"}]'),
    -- 3
    (3, 'When faced with a problem, how do you best like to solve it?',
     '["I like to try new ideas and adjust","I break it into clear steps","I research before acting","I like to collaborate for solutions"]',
     '[{"points":40,"profile":8,"frequency":"A"},
       {"points":10,"profile":6,"frequency":"D"},
       {"points":20,"profile":5,"frequency":"C"},
       {"points":30,"profile":3,"frequency":"B"}]'),
    -- 4
    (4, 'How do you prefer to communicate within a team?',
     '["I am thoughtful and organised","I like to focus on facts","I am direct and to the point","I am friendly and supportive"]',
     '[{"points":20,"profile":5,"frequency":"C"},
       {"points":10,"profile":7,"frequency":"D"},
       {"points":40,"profile":8,"frequency":"A"},
       {"points":30,"profile":3,"frequency":"B"}]'),
    -- 5
    (5, 'What motivates you mostly in your work?',
     '["I like new challenges","I like to help others succeed","Making sure things are running smoothly","I like to produce high quality"]',
     '[{"points":40,"profile":1,"frequency":"A"},
       {"points":30,"profile":4,"frequency":"B"},
       {"points":20,"profile":5,"frequency":"C"},
       {"points":10,"profile":7,"frequency":"D"}]'),
    -- 6
    (6, 'When things get stressful at work, how would you respond?',
     '["I like to pause and plan","I like to stay organised","I like to reach out for support","I just like to push through"]',
     '[{"points":10,"profile":7,"frequency":"D"},
       {"points":20,"profile":6,"frequency":"C"},
       {"points":30,"profile":4,"frequency":"B"},
       {"points":40,"profile":2,"frequency":"A"}]'),
    -- 7
    (7, 'How do you generally handle feedback?',
     '["I value fact-based feedback","I appreciate quick feedback","I focus on relationships and connection","I prefer to receive detailed feedback"]',
     '[{"points":10,"profile":8,"frequency":"D"},
       {"points":40,"profile":8,"frequency":"A"},
       {"points":30,"profile":2,"frequency":"B"},
       {"points":20,"profile":5,"frequency":"C"}]'),
    -- 8
    (8, 'How do you recover after making a mistake?',
     '["I like to reflect and plan","I fix the mistake","I like to discuss with a colleague","I like to move on and adjust"]',
     '[{"points":10,"profile":7,"frequency":"D"},
       {"points":10,"profile":8,"frequency":"D"},
       {"points":30,"profile":4,"frequency":"B"},
       {"points":40,"profile":2,"frequency":"A"}]'),
    -- 9
    (9, 'How do you feel after completing a big project?',
     '["I am relieved it went to plan","I am proud of the accuracy","I am grateful for team support","I am excited to get on with the next challenge"]',
     '[{"points":20,"profile":5,"frequency":"C"},
       {"points":10,"profile":6,"frequency":"D"},
       {"points":30,"profile":4,"frequency":"B"},
       {"points":40,"profile":1,"frequency":"A"}]'),
    -- 10
    (10,'How do you best approach learning new things?',
     '["I like to learn with others","I prefer structured learning","I like to experiment with concepts","I like a deep dive to fully understand"]',
     '[{"points":30,"profile":3,"frequency":"B"},
       {"points":40,"profile":2,"frequency":"A"},
       {"points":40,"profile":1,"frequency":"A"},
       {"points":10,"profile":7,"frequency":"D"}]'),
    -- 11
    (11,'What type of work energises you?',
     '["Innovative projects","Organising and building processes","Collaborating with others","Analysing data"]',
     '[{"points":40,"profile":1,"frequency":"A"},
       {"points":20,"profile":5,"frequency":"C"},
       {"points":30,"profile":3,"frequency":"B"},
       {"points":10,"profile":7,"frequency":"D"}]'),
    -- 12
    (12,'How do you prefer to approach personal growth?',
     '["I like to challenge myself","I like to refine my skills","I like to set specific goals","Through learning with others"]',
     '[{"points":40,"profile":2,"frequency":"A"},
       {"points":20,"profile":6,"frequency":"C"},
       {"points":10,"profile":8,"frequency":"D"},
       {"points":30,"profile":4,"frequency":"B"}]'),
    -- 13
    (13,'How do you best handle disagreements?',
     '["I like to assert my position","I like to seek middle ground","I look for logical solutions","I feel better to stay objective"]',
     '[{"points":40,"profile":2,"frequency":"A"},
       {"points":30,"profile":4,"frequency":"B"},
       {"points":20,"profile":5,"frequency":"C"},
       {"points":10,"profile":8,"frequency":"D"}]'),
    -- 14
    (14,'How do you prefer to work on a team?',
     '["I like to lead and make decisions","I prefer to foster team collaboration","I prefer to organise tasks","I provide analytical support"]',
     '[{"points":40,"profile":1,"frequency":"A"},
       {"points":30,"profile":3,"frequency":"B"},
       {"points":10,"profile":6,"frequency":"D"},
       {"points":20,"profile":6,"frequency":"C"}]'),
    -- 15
    (15,'What frustrates you most in a team or social setting?',
     '["Lack of clear goals","Slow decision-making","Lack of attention to detail","Conflict between members"]',
     '[{"points":20,"profile":5,"frequency":"C"},
       {"points":40,"profile":2,"frequency":"A"},
       {"points":10,"profile":8,"frequency":"D"},
       {"points":30,"profile":4,"frequency":"B"}]')
  ) as t(qn, prompt, opts, wts);

end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.set_org_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if new.owner_user_id is null then
    new.owner_user_id := auth.uid();
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end$function$
;

CREATE OR REPLACE FUNCTION public.slugify(txt text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select trim(both '-' from
         regexp_replace(
           regexp_replace(lower($1), '[^a-z0-9]+', '-', 'g'),
           '-{2,}', '-', 'g'
         )
  );
$function$
;

create or replace view "public"."v_org_profiles_8" as  SELECT p.org_id,
    p.company_name,
    p.first_name,
    p.last_name,
    p."position",
    p.contact_email,
    p.phone_country,
    p.phone_number,
    p.created_at,
    p.updated_at,
    p.id,
    p.framework_id,
    p.image_url,
    p.image_prompt,
    p.frequency,
    p.ordinal,
    p.name,
    p.summary,
    p.strengths,
    f.name AS framework_name
   FROM (public.org_profiles p
     JOIN public.org_frameworks f ON ((f.id = p.framework_id)))
  WHERE ((p.ordinal >= 1) AND (p.ordinal <= 8));


create or replace view "public"."v_portal_profile_map" as  SELECT p.test_id,
    p.profile_code,
    p.profile_name,
    f.frequency_code,
    f.frequency_name
   FROM (portal.test_profile_labels p
     LEFT JOIN portal.test_frequency_labels f ON (((f.test_id = p.test_id) AND (f.frequency_code = p.frequency_code))));


grant delete on table "portal"."dashboard_scores" to "service_role";

grant insert on table "portal"."dashboard_scores" to "service_role";

grant select on table "portal"."dashboard_scores" to "service_role";

grant update on table "portal"."dashboard_scores" to "service_role";

grant delete on table "portal"."orgs" to "service_role";

grant insert on table "portal"."orgs" to "service_role";

grant select on table "portal"."orgs" to "service_role";

grant update on table "portal"."orgs" to "service_role";

grant delete on table "portal"."test_answers" to "service_role";

grant insert on table "portal"."test_answers" to "service_role";

grant select on table "portal"."test_answers" to "service_role";

grant update on table "portal"."test_answers" to "service_role";

grant delete on table "portal"."test_frequency_labels" to "service_role";

grant insert on table "portal"."test_frequency_labels" to "service_role";

grant select on table "portal"."test_frequency_labels" to "service_role";

grant update on table "portal"."test_frequency_labels" to "service_role";

grant delete on table "portal"."test_links" to "service_role";

grant insert on table "portal"."test_links" to "service_role";

grant select on table "portal"."test_links" to "service_role";

grant update on table "portal"."test_links" to "service_role";

grant delete on table "portal"."test_profile_labels" to "service_role";

grant insert on table "portal"."test_profile_labels" to "service_role";

grant select on table "portal"."test_profile_labels" to "service_role";

grant update on table "portal"."test_profile_labels" to "service_role";

grant delete on table "portal"."test_questions" to "service_role";

grant insert on table "portal"."test_questions" to "service_role";

grant select on table "portal"."test_questions" to "service_role";

grant update on table "portal"."test_questions" to "service_role";

grant delete on table "portal"."test_results" to "service_role";

grant insert on table "portal"."test_results" to "service_role";

grant select on table "portal"."test_results" to "service_role";

grant update on table "portal"."test_results" to "service_role";

grant delete on table "portal"."test_submissions" to "service_role";

grant insert on table "portal"."test_submissions" to "service_role";

grant select on table "portal"."test_submissions" to "service_role";

grant update on table "portal"."test_submissions" to "service_role";

grant delete on table "portal"."test_takers" to "service_role";

grant insert on table "portal"."test_takers" to "service_role";

grant select on table "portal"."test_takers" to "service_role";

grant update on table "portal"."test_takers" to "service_role";

grant delete on table "portal"."tests" to "service_role";

grant insert on table "portal"."tests" to "service_role";

grant select on table "portal"."tests" to "service_role";

grant update on table "portal"."tests" to "service_role";

grant delete on table "public"."base_options" to "anon";

grant insert on table "public"."base_options" to "anon";

grant references on table "public"."base_options" to "anon";

grant select on table "public"."base_options" to "anon";

grant trigger on table "public"."base_options" to "anon";

grant truncate on table "public"."base_options" to "anon";

grant update on table "public"."base_options" to "anon";

grant delete on table "public"."base_options" to "authenticated";

grant insert on table "public"."base_options" to "authenticated";

grant references on table "public"."base_options" to "authenticated";

grant select on table "public"."base_options" to "authenticated";

grant trigger on table "public"."base_options" to "authenticated";

grant truncate on table "public"."base_options" to "authenticated";

grant update on table "public"."base_options" to "authenticated";

grant delete on table "public"."base_options" to "service_role";

grant insert on table "public"."base_options" to "service_role";

grant references on table "public"."base_options" to "service_role";

grant select on table "public"."base_options" to "service_role";

grant trigger on table "public"."base_options" to "service_role";

grant truncate on table "public"."base_options" to "service_role";

grant update on table "public"."base_options" to "service_role";

grant delete on table "public"."base_questions" to "anon";

grant insert on table "public"."base_questions" to "anon";

grant references on table "public"."base_questions" to "anon";

grant select on table "public"."base_questions" to "anon";

grant trigger on table "public"."base_questions" to "anon";

grant truncate on table "public"."base_questions" to "anon";

grant update on table "public"."base_questions" to "anon";

grant delete on table "public"."base_questions" to "authenticated";

grant insert on table "public"."base_questions" to "authenticated";

grant references on table "public"."base_questions" to "authenticated";

grant select on table "public"."base_questions" to "authenticated";

grant trigger on table "public"."base_questions" to "authenticated";

grant truncate on table "public"."base_questions" to "authenticated";

grant update on table "public"."base_questions" to "authenticated";

grant delete on table "public"."base_questions" to "service_role";

grant insert on table "public"."base_questions" to "service_role";

grant references on table "public"."base_questions" to "service_role";

grant select on table "public"."base_questions" to "service_role";

grant trigger on table "public"."base_questions" to "service_role";

grant truncate on table "public"."base_questions" to "service_role";

grant update on table "public"."base_questions" to "service_role";

grant delete on table "public"."brand_settings" to "anon";

grant insert on table "public"."brand_settings" to "anon";

grant references on table "public"."brand_settings" to "anon";

grant select on table "public"."brand_settings" to "anon";

grant trigger on table "public"."brand_settings" to "anon";

grant truncate on table "public"."brand_settings" to "anon";

grant update on table "public"."brand_settings" to "anon";

grant delete on table "public"."brand_settings" to "authenticated";

grant insert on table "public"."brand_settings" to "authenticated";

grant references on table "public"."brand_settings" to "authenticated";

grant select on table "public"."brand_settings" to "authenticated";

grant trigger on table "public"."brand_settings" to "authenticated";

grant truncate on table "public"."brand_settings" to "authenticated";

grant update on table "public"."brand_settings" to "authenticated";

grant delete on table "public"."brand_settings" to "service_role";

grant insert on table "public"."brand_settings" to "service_role";

grant references on table "public"."brand_settings" to "service_role";

grant select on table "public"."brand_settings" to "service_role";

grant trigger on table "public"."brand_settings" to "service_role";

grant truncate on table "public"."brand_settings" to "service_role";

grant update on table "public"."brand_settings" to "service_role";

grant delete on table "public"."framework_settings" to "anon";

grant insert on table "public"."framework_settings" to "anon";

grant references on table "public"."framework_settings" to "anon";

grant select on table "public"."framework_settings" to "anon";

grant trigger on table "public"."framework_settings" to "anon";

grant truncate on table "public"."framework_settings" to "anon";

grant update on table "public"."framework_settings" to "anon";

grant delete on table "public"."framework_settings" to "authenticated";

grant insert on table "public"."framework_settings" to "authenticated";

grant references on table "public"."framework_settings" to "authenticated";

grant select on table "public"."framework_settings" to "authenticated";

grant trigger on table "public"."framework_settings" to "authenticated";

grant truncate on table "public"."framework_settings" to "authenticated";

grant update on table "public"."framework_settings" to "authenticated";

grant delete on table "public"."framework_settings" to "service_role";

grant insert on table "public"."framework_settings" to "service_role";

grant references on table "public"."framework_settings" to "service_role";

grant select on table "public"."framework_settings" to "service_role";

grant trigger on table "public"."framework_settings" to "service_role";

grant truncate on table "public"."framework_settings" to "service_role";

grant update on table "public"."framework_settings" to "service_role";

grant delete on table "public"."frameworks" to "anon";

grant insert on table "public"."frameworks" to "anon";

grant references on table "public"."frameworks" to "anon";

grant select on table "public"."frameworks" to "anon";

grant trigger on table "public"."frameworks" to "anon";

grant truncate on table "public"."frameworks" to "anon";

grant update on table "public"."frameworks" to "anon";

grant delete on table "public"."frameworks" to "authenticated";

grant insert on table "public"."frameworks" to "authenticated";

grant references on table "public"."frameworks" to "authenticated";

grant select on table "public"."frameworks" to "authenticated";

grant trigger on table "public"."frameworks" to "authenticated";

grant truncate on table "public"."frameworks" to "authenticated";

grant update on table "public"."frameworks" to "authenticated";

grant delete on table "public"."frameworks" to "service_role";

grant insert on table "public"."frameworks" to "service_role";

grant references on table "public"."frameworks" to "service_role";

grant select on table "public"."frameworks" to "service_role";

grant trigger on table "public"."frameworks" to "service_role";

grant truncate on table "public"."frameworks" to "service_role";

grant update on table "public"."frameworks" to "service_role";

grant delete on table "public"."org_brand_settings" to "anon";

grant insert on table "public"."org_brand_settings" to "anon";

grant references on table "public"."org_brand_settings" to "anon";

grant select on table "public"."org_brand_settings" to "anon";

grant trigger on table "public"."org_brand_settings" to "anon";

grant truncate on table "public"."org_brand_settings" to "anon";

grant update on table "public"."org_brand_settings" to "anon";

grant delete on table "public"."org_brand_settings" to "authenticated";

grant insert on table "public"."org_brand_settings" to "authenticated";

grant references on table "public"."org_brand_settings" to "authenticated";

grant select on table "public"."org_brand_settings" to "authenticated";

grant trigger on table "public"."org_brand_settings" to "authenticated";

grant truncate on table "public"."org_brand_settings" to "authenticated";

grant update on table "public"."org_brand_settings" to "authenticated";

grant delete on table "public"."org_brand_settings" to "service_role";

grant insert on table "public"."org_brand_settings" to "service_role";

grant references on table "public"."org_brand_settings" to "service_role";

grant select on table "public"."org_brand_settings" to "service_role";

grant trigger on table "public"."org_brand_settings" to "service_role";

grant truncate on table "public"."org_brand_settings" to "service_role";

grant update on table "public"."org_brand_settings" to "service_role";

grant delete on table "public"."org_frameworks" to "anon";

grant insert on table "public"."org_frameworks" to "anon";

grant references on table "public"."org_frameworks" to "anon";

grant select on table "public"."org_frameworks" to "anon";

grant trigger on table "public"."org_frameworks" to "anon";

grant truncate on table "public"."org_frameworks" to "anon";

grant update on table "public"."org_frameworks" to "anon";

grant delete on table "public"."org_frameworks" to "authenticated";

grant insert on table "public"."org_frameworks" to "authenticated";

grant references on table "public"."org_frameworks" to "authenticated";

grant select on table "public"."org_frameworks" to "authenticated";

grant trigger on table "public"."org_frameworks" to "authenticated";

grant truncate on table "public"."org_frameworks" to "authenticated";

grant update on table "public"."org_frameworks" to "authenticated";

grant delete on table "public"."org_frameworks" to "service_role";

grant insert on table "public"."org_frameworks" to "service_role";

grant references on table "public"."org_frameworks" to "service_role";

grant select on table "public"."org_frameworks" to "service_role";

grant trigger on table "public"."org_frameworks" to "service_role";

grant truncate on table "public"."org_frameworks" to "service_role";

grant update on table "public"."org_frameworks" to "service_role";

grant delete on table "public"."org_frequencies" to "anon";

grant insert on table "public"."org_frequencies" to "anon";

grant references on table "public"."org_frequencies" to "anon";

grant select on table "public"."org_frequencies" to "anon";

grant trigger on table "public"."org_frequencies" to "anon";

grant truncate on table "public"."org_frequencies" to "anon";

grant update on table "public"."org_frequencies" to "anon";

grant delete on table "public"."org_frequencies" to "authenticated";

grant insert on table "public"."org_frequencies" to "authenticated";

grant references on table "public"."org_frequencies" to "authenticated";

grant select on table "public"."org_frequencies" to "authenticated";

grant trigger on table "public"."org_frequencies" to "authenticated";

grant truncate on table "public"."org_frequencies" to "authenticated";

grant update on table "public"."org_frequencies" to "authenticated";

grant delete on table "public"."org_frequencies" to "service_role";

grant insert on table "public"."org_frequencies" to "service_role";

grant references on table "public"."org_frequencies" to "service_role";

grant select on table "public"."org_frequencies" to "service_role";

grant trigger on table "public"."org_frequencies" to "service_role";

grant truncate on table "public"."org_frequencies" to "service_role";

grant update on table "public"."org_frequencies" to "service_role";

grant delete on table "public"."org_members" to "anon";

grant insert on table "public"."org_members" to "anon";

grant references on table "public"."org_members" to "anon";

grant select on table "public"."org_members" to "anon";

grant trigger on table "public"."org_members" to "anon";

grant truncate on table "public"."org_members" to "anon";

grant update on table "public"."org_members" to "anon";

grant delete on table "public"."org_members" to "authenticated";

grant insert on table "public"."org_members" to "authenticated";

grant references on table "public"."org_members" to "authenticated";

grant select on table "public"."org_members" to "authenticated";

grant trigger on table "public"."org_members" to "authenticated";

grant truncate on table "public"."org_members" to "authenticated";

grant update on table "public"."org_members" to "authenticated";

grant delete on table "public"."org_members" to "service_role";

grant insert on table "public"."org_members" to "service_role";

grant references on table "public"."org_members" to "service_role";

grant select on table "public"."org_members" to "service_role";

grant trigger on table "public"."org_members" to "service_role";

grant truncate on table "public"."org_members" to "service_role";

grant update on table "public"."org_members" to "service_role";

grant delete on table "public"."org_memberships" to "anon";

grant insert on table "public"."org_memberships" to "anon";

grant references on table "public"."org_memberships" to "anon";

grant select on table "public"."org_memberships" to "anon";

grant trigger on table "public"."org_memberships" to "anon";

grant truncate on table "public"."org_memberships" to "anon";

grant update on table "public"."org_memberships" to "anon";

grant delete on table "public"."org_memberships" to "authenticated";

grant insert on table "public"."org_memberships" to "authenticated";

grant references on table "public"."org_memberships" to "authenticated";

grant select on table "public"."org_memberships" to "authenticated";

grant trigger on table "public"."org_memberships" to "authenticated";

grant truncate on table "public"."org_memberships" to "authenticated";

grant update on table "public"."org_memberships" to "authenticated";

grant delete on table "public"."org_memberships" to "service_role";

grant insert on table "public"."org_memberships" to "service_role";

grant references on table "public"."org_memberships" to "service_role";

grant select on table "public"."org_memberships" to "service_role";

grant trigger on table "public"."org_memberships" to "service_role";

grant truncate on table "public"."org_memberships" to "service_role";

grant update on table "public"."org_memberships" to "service_role";

grant delete on table "public"."org_onboarding" to "anon";

grant insert on table "public"."org_onboarding" to "anon";

grant references on table "public"."org_onboarding" to "anon";

grant select on table "public"."org_onboarding" to "anon";

grant trigger on table "public"."org_onboarding" to "anon";

grant truncate on table "public"."org_onboarding" to "anon";

grant update on table "public"."org_onboarding" to "anon";

grant delete on table "public"."org_onboarding" to "authenticated";

grant insert on table "public"."org_onboarding" to "authenticated";

grant references on table "public"."org_onboarding" to "authenticated";

grant select on table "public"."org_onboarding" to "authenticated";

grant trigger on table "public"."org_onboarding" to "authenticated";

grant truncate on table "public"."org_onboarding" to "authenticated";

grant update on table "public"."org_onboarding" to "authenticated";

grant delete on table "public"."org_onboarding" to "service_role";

grant insert on table "public"."org_onboarding" to "service_role";

grant references on table "public"."org_onboarding" to "service_role";

grant select on table "public"."org_onboarding" to "service_role";

grant trigger on table "public"."org_onboarding" to "service_role";

grant truncate on table "public"."org_onboarding" to "service_role";

grant update on table "public"."org_onboarding" to "service_role";

grant delete on table "public"."org_profile_codes" to "anon";

grant insert on table "public"."org_profile_codes" to "anon";

grant references on table "public"."org_profile_codes" to "anon";

grant select on table "public"."org_profile_codes" to "anon";

grant trigger on table "public"."org_profile_codes" to "anon";

grant truncate on table "public"."org_profile_codes" to "anon";

grant update on table "public"."org_profile_codes" to "anon";

grant delete on table "public"."org_profile_codes" to "authenticated";

grant insert on table "public"."org_profile_codes" to "authenticated";

grant references on table "public"."org_profile_codes" to "authenticated";

grant select on table "public"."org_profile_codes" to "authenticated";

grant trigger on table "public"."org_profile_codes" to "authenticated";

grant truncate on table "public"."org_profile_codes" to "authenticated";

grant update on table "public"."org_profile_codes" to "authenticated";

grant delete on table "public"."org_profile_codes" to "service_role";

grant insert on table "public"."org_profile_codes" to "service_role";

grant references on table "public"."org_profile_codes" to "service_role";

grant select on table "public"."org_profile_codes" to "service_role";

grant trigger on table "public"."org_profile_codes" to "service_role";

grant truncate on table "public"."org_profile_codes" to "service_role";

grant update on table "public"."org_profile_codes" to "service_role";

grant delete on table "public"."org_profile_compatibility" to "anon";

grant insert on table "public"."org_profile_compatibility" to "anon";

grant references on table "public"."org_profile_compatibility" to "anon";

grant select on table "public"."org_profile_compatibility" to "anon";

grant trigger on table "public"."org_profile_compatibility" to "anon";

grant truncate on table "public"."org_profile_compatibility" to "anon";

grant update on table "public"."org_profile_compatibility" to "anon";

grant delete on table "public"."org_profile_compatibility" to "authenticated";

grant insert on table "public"."org_profile_compatibility" to "authenticated";

grant references on table "public"."org_profile_compatibility" to "authenticated";

grant select on table "public"."org_profile_compatibility" to "authenticated";

grant trigger on table "public"."org_profile_compatibility" to "authenticated";

grant truncate on table "public"."org_profile_compatibility" to "authenticated";

grant update on table "public"."org_profile_compatibility" to "authenticated";

grant delete on table "public"."org_profile_compatibility" to "service_role";

grant insert on table "public"."org_profile_compatibility" to "service_role";

grant references on table "public"."org_profile_compatibility" to "service_role";

grant select on table "public"."org_profile_compatibility" to "service_role";

grant trigger on table "public"."org_profile_compatibility" to "service_role";

grant truncate on table "public"."org_profile_compatibility" to "service_role";

grant update on table "public"."org_profile_compatibility" to "service_role";

grant delete on table "public"."org_profile_reports" to "anon";

grant insert on table "public"."org_profile_reports" to "anon";

grant references on table "public"."org_profile_reports" to "anon";

grant select on table "public"."org_profile_reports" to "anon";

grant trigger on table "public"."org_profile_reports" to "anon";

grant truncate on table "public"."org_profile_reports" to "anon";

grant update on table "public"."org_profile_reports" to "anon";

grant delete on table "public"."org_profile_reports" to "authenticated";

grant insert on table "public"."org_profile_reports" to "authenticated";

grant references on table "public"."org_profile_reports" to "authenticated";

grant select on table "public"."org_profile_reports" to "authenticated";

grant trigger on table "public"."org_profile_reports" to "authenticated";

grant truncate on table "public"."org_profile_reports" to "authenticated";

grant update on table "public"."org_profile_reports" to "authenticated";

grant delete on table "public"."org_profile_reports" to "service_role";

grant insert on table "public"."org_profile_reports" to "service_role";

grant references on table "public"."org_profile_reports" to "service_role";

grant select on table "public"."org_profile_reports" to "service_role";

grant trigger on table "public"."org_profile_reports" to "service_role";

grant truncate on table "public"."org_profile_reports" to "service_role";

grant update on table "public"."org_profile_reports" to "service_role";

grant delete on table "public"."org_profiles" to "anon";

grant insert on table "public"."org_profiles" to "anon";

grant references on table "public"."org_profiles" to "anon";

grant select on table "public"."org_profiles" to "anon";

grant trigger on table "public"."org_profiles" to "anon";

grant truncate on table "public"."org_profiles" to "anon";

grant update on table "public"."org_profiles" to "anon";

grant delete on table "public"."org_profiles" to "authenticated";

grant insert on table "public"."org_profiles" to "authenticated";

grant references on table "public"."org_profiles" to "authenticated";

grant select on table "public"."org_profiles" to "authenticated";

grant trigger on table "public"."org_profiles" to "authenticated";

grant truncate on table "public"."org_profiles" to "authenticated";

grant update on table "public"."org_profiles" to "authenticated";

grant delete on table "public"."org_profiles" to "service_role";

grant insert on table "public"."org_profiles" to "service_role";

grant references on table "public"."org_profiles" to "service_role";

grant select on table "public"."org_profiles" to "service_role";

grant trigger on table "public"."org_profiles" to "service_role";

grant truncate on table "public"."org_profiles" to "service_role";

grant update on table "public"."org_profiles" to "service_role";

grant delete on table "public"."org_question_options" to "anon";

grant insert on table "public"."org_question_options" to "anon";

grant references on table "public"."org_question_options" to "anon";

grant select on table "public"."org_question_options" to "anon";

grant trigger on table "public"."org_question_options" to "anon";

grant truncate on table "public"."org_question_options" to "anon";

grant update on table "public"."org_question_options" to "anon";

grant delete on table "public"."org_question_options" to "authenticated";

grant insert on table "public"."org_question_options" to "authenticated";

grant references on table "public"."org_question_options" to "authenticated";

grant select on table "public"."org_question_options" to "authenticated";

grant trigger on table "public"."org_question_options" to "authenticated";

grant truncate on table "public"."org_question_options" to "authenticated";

grant update on table "public"."org_question_options" to "authenticated";

grant delete on table "public"."org_question_options" to "service_role";

grant insert on table "public"."org_question_options" to "service_role";

grant references on table "public"."org_question_options" to "service_role";

grant select on table "public"."org_question_options" to "service_role";

grant trigger on table "public"."org_question_options" to "service_role";

grant truncate on table "public"."org_question_options" to "service_role";

grant update on table "public"."org_question_options" to "service_role";

grant delete on table "public"."org_question_weights" to "anon";

grant insert on table "public"."org_question_weights" to "anon";

grant references on table "public"."org_question_weights" to "anon";

grant select on table "public"."org_question_weights" to "anon";

grant trigger on table "public"."org_question_weights" to "anon";

grant truncate on table "public"."org_question_weights" to "anon";

grant update on table "public"."org_question_weights" to "anon";

grant delete on table "public"."org_question_weights" to "authenticated";

grant insert on table "public"."org_question_weights" to "authenticated";

grant references on table "public"."org_question_weights" to "authenticated";

grant select on table "public"."org_question_weights" to "authenticated";

grant trigger on table "public"."org_question_weights" to "authenticated";

grant truncate on table "public"."org_question_weights" to "authenticated";

grant update on table "public"."org_question_weights" to "authenticated";

grant delete on table "public"."org_question_weights" to "service_role";

grant insert on table "public"."org_question_weights" to "service_role";

grant references on table "public"."org_question_weights" to "service_role";

grant select on table "public"."org_question_weights" to "service_role";

grant trigger on table "public"."org_question_weights" to "service_role";

grant truncate on table "public"."org_question_weights" to "service_role";

grant update on table "public"."org_question_weights" to "service_role";

grant delete on table "public"."org_questions" to "anon";

grant insert on table "public"."org_questions" to "anon";

grant references on table "public"."org_questions" to "anon";

grant select on table "public"."org_questions" to "anon";

grant trigger on table "public"."org_questions" to "anon";

grant truncate on table "public"."org_questions" to "anon";

grant update on table "public"."org_questions" to "anon";

grant delete on table "public"."org_questions" to "authenticated";

grant insert on table "public"."org_questions" to "authenticated";

grant references on table "public"."org_questions" to "authenticated";

grant select on table "public"."org_questions" to "authenticated";

grant trigger on table "public"."org_questions" to "authenticated";

grant truncate on table "public"."org_questions" to "authenticated";

grant update on table "public"."org_questions" to "authenticated";

grant delete on table "public"."org_questions" to "service_role";

grant insert on table "public"."org_questions" to "service_role";

grant references on table "public"."org_questions" to "service_role";

grant select on table "public"."org_questions" to "service_role";

grant trigger on table "public"."org_questions" to "service_role";

grant truncate on table "public"."org_questions" to "service_role";

grant update on table "public"."org_questions" to "service_role";

grant delete on table "public"."org_report_drafts" to "anon";

grant insert on table "public"."org_report_drafts" to "anon";

grant references on table "public"."org_report_drafts" to "anon";

grant select on table "public"."org_report_drafts" to "anon";

grant trigger on table "public"."org_report_drafts" to "anon";

grant truncate on table "public"."org_report_drafts" to "anon";

grant update on table "public"."org_report_drafts" to "anon";

grant delete on table "public"."org_report_drafts" to "authenticated";

grant insert on table "public"."org_report_drafts" to "authenticated";

grant references on table "public"."org_report_drafts" to "authenticated";

grant select on table "public"."org_report_drafts" to "authenticated";

grant trigger on table "public"."org_report_drafts" to "authenticated";

grant truncate on table "public"."org_report_drafts" to "authenticated";

grant update on table "public"."org_report_drafts" to "authenticated";

grant delete on table "public"."org_report_drafts" to "service_role";

grant insert on table "public"."org_report_drafts" to "service_role";

grant references on table "public"."org_report_drafts" to "service_role";

grant select on table "public"."org_report_drafts" to "service_role";

grant trigger on table "public"."org_report_drafts" to "service_role";

grant truncate on table "public"."org_report_drafts" to "service_role";

grant update on table "public"."org_report_drafts" to "service_role";

grant delete on table "public"."org_test_answers" to "anon";

grant insert on table "public"."org_test_answers" to "anon";

grant references on table "public"."org_test_answers" to "anon";

grant select on table "public"."org_test_answers" to "anon";

grant trigger on table "public"."org_test_answers" to "anon";

grant truncate on table "public"."org_test_answers" to "anon";

grant update on table "public"."org_test_answers" to "anon";

grant delete on table "public"."org_test_answers" to "authenticated";

grant insert on table "public"."org_test_answers" to "authenticated";

grant references on table "public"."org_test_answers" to "authenticated";

grant select on table "public"."org_test_answers" to "authenticated";

grant trigger on table "public"."org_test_answers" to "authenticated";

grant truncate on table "public"."org_test_answers" to "authenticated";

grant update on table "public"."org_test_answers" to "authenticated";

grant delete on table "public"."org_test_answers" to "service_role";

grant insert on table "public"."org_test_answers" to "service_role";

grant references on table "public"."org_test_answers" to "service_role";

grant select on table "public"."org_test_answers" to "service_role";

grant trigger on table "public"."org_test_answers" to "service_role";

grant truncate on table "public"."org_test_answers" to "service_role";

grant update on table "public"."org_test_answers" to "service_role";

grant delete on table "public"."org_test_defs" to "anon";

grant insert on table "public"."org_test_defs" to "anon";

grant references on table "public"."org_test_defs" to "anon";

grant select on table "public"."org_test_defs" to "anon";

grant trigger on table "public"."org_test_defs" to "anon";

grant truncate on table "public"."org_test_defs" to "anon";

grant update on table "public"."org_test_defs" to "anon";

grant delete on table "public"."org_test_defs" to "authenticated";

grant insert on table "public"."org_test_defs" to "authenticated";

grant references on table "public"."org_test_defs" to "authenticated";

grant select on table "public"."org_test_defs" to "authenticated";

grant trigger on table "public"."org_test_defs" to "authenticated";

grant truncate on table "public"."org_test_defs" to "authenticated";

grant update on table "public"."org_test_defs" to "authenticated";

grant delete on table "public"."org_test_defs" to "service_role";

grant insert on table "public"."org_test_defs" to "service_role";

grant references on table "public"."org_test_defs" to "service_role";

grant select on table "public"."org_test_defs" to "service_role";

grant trigger on table "public"."org_test_defs" to "service_role";

grant truncate on table "public"."org_test_defs" to "service_role";

grant update on table "public"."org_test_defs" to "service_role";

grant delete on table "public"."org_test_questions" to "anon";

grant insert on table "public"."org_test_questions" to "anon";

grant references on table "public"."org_test_questions" to "anon";

grant select on table "public"."org_test_questions" to "anon";

grant trigger on table "public"."org_test_questions" to "anon";

grant truncate on table "public"."org_test_questions" to "anon";

grant update on table "public"."org_test_questions" to "anon";

grant delete on table "public"."org_test_questions" to "authenticated";

grant insert on table "public"."org_test_questions" to "authenticated";

grant references on table "public"."org_test_questions" to "authenticated";

grant select on table "public"."org_test_questions" to "authenticated";

grant trigger on table "public"."org_test_questions" to "authenticated";

grant truncate on table "public"."org_test_questions" to "authenticated";

grant update on table "public"."org_test_questions" to "authenticated";

grant delete on table "public"."org_test_questions" to "service_role";

grant insert on table "public"."org_test_questions" to "service_role";

grant references on table "public"."org_test_questions" to "service_role";

grant select on table "public"."org_test_questions" to "service_role";

grant trigger on table "public"."org_test_questions" to "service_role";

grant truncate on table "public"."org_test_questions" to "service_role";

grant update on table "public"."org_test_questions" to "service_role";

grant delete on table "public"."org_tests" to "anon";

grant insert on table "public"."org_tests" to "anon";

grant references on table "public"."org_tests" to "anon";

grant select on table "public"."org_tests" to "anon";

grant trigger on table "public"."org_tests" to "anon";

grant truncate on table "public"."org_tests" to "anon";

grant update on table "public"."org_tests" to "anon";

grant delete on table "public"."org_tests" to "authenticated";

grant insert on table "public"."org_tests" to "authenticated";

grant references on table "public"."org_tests" to "authenticated";

grant select on table "public"."org_tests" to "authenticated";

grant trigger on table "public"."org_tests" to "authenticated";

grant truncate on table "public"."org_tests" to "authenticated";

grant update on table "public"."org_tests" to "authenticated";

grant delete on table "public"."org_tests" to "service_role";

grant insert on table "public"."org_tests" to "service_role";

grant references on table "public"."org_tests" to "service_role";

grant select on table "public"."org_tests" to "service_role";

grant trigger on table "public"."org_tests" to "service_role";

grant truncate on table "public"."org_tests" to "service_role";

grant update on table "public"."org_tests" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";

grant delete on table "public"."portal_invites" to "anon";

grant insert on table "public"."portal_invites" to "anon";

grant references on table "public"."portal_invites" to "anon";

grant select on table "public"."portal_invites" to "anon";

grant trigger on table "public"."portal_invites" to "anon";

grant truncate on table "public"."portal_invites" to "anon";

grant update on table "public"."portal_invites" to "anon";

grant delete on table "public"."portal_invites" to "authenticated";

grant insert on table "public"."portal_invites" to "authenticated";

grant references on table "public"."portal_invites" to "authenticated";

grant select on table "public"."portal_invites" to "authenticated";

grant trigger on table "public"."portal_invites" to "authenticated";

grant truncate on table "public"."portal_invites" to "authenticated";

grant update on table "public"."portal_invites" to "authenticated";

grant delete on table "public"."portal_invites" to "service_role";

grant insert on table "public"."portal_invites" to "service_role";

grant references on table "public"."portal_invites" to "service_role";

grant select on table "public"."portal_invites" to "service_role";

grant trigger on table "public"."portal_invites" to "service_role";

grant truncate on table "public"."portal_invites" to "service_role";

grant update on table "public"."portal_invites" to "service_role";

grant delete on table "public"."portal_members" to "anon";

grant insert on table "public"."portal_members" to "anon";

grant references on table "public"."portal_members" to "anon";

grant select on table "public"."portal_members" to "anon";

grant trigger on table "public"."portal_members" to "anon";

grant truncate on table "public"."portal_members" to "anon";

grant update on table "public"."portal_members" to "anon";

grant delete on table "public"."portal_members" to "authenticated";

grant insert on table "public"."portal_members" to "authenticated";

grant references on table "public"."portal_members" to "authenticated";

grant select on table "public"."portal_members" to "authenticated";

grant trigger on table "public"."portal_members" to "authenticated";

grant truncate on table "public"."portal_members" to "authenticated";

grant update on table "public"."portal_members" to "authenticated";

grant delete on table "public"."portal_members" to "service_role";

grant insert on table "public"."portal_members" to "service_role";

grant references on table "public"."portal_members" to "service_role";

grant select on table "public"."portal_members" to "service_role";

grant trigger on table "public"."portal_members" to "service_role";

grant truncate on table "public"."portal_members" to "service_role";

grant update on table "public"."portal_members" to "service_role";

grant delete on table "public"."profile_compat" to "anon";

grant insert on table "public"."profile_compat" to "anon";

grant references on table "public"."profile_compat" to "anon";

grant select on table "public"."profile_compat" to "anon";

grant trigger on table "public"."profile_compat" to "anon";

grant truncate on table "public"."profile_compat" to "anon";

grant update on table "public"."profile_compat" to "anon";

grant delete on table "public"."profile_compat" to "authenticated";

grant insert on table "public"."profile_compat" to "authenticated";

grant references on table "public"."profile_compat" to "authenticated";

grant select on table "public"."profile_compat" to "authenticated";

grant trigger on table "public"."profile_compat" to "authenticated";

grant truncate on table "public"."profile_compat" to "authenticated";

grant update on table "public"."profile_compat" to "authenticated";

grant delete on table "public"."profile_compat" to "service_role";

grant insert on table "public"."profile_compat" to "service_role";

grant references on table "public"."profile_compat" to "service_role";

grant select on table "public"."profile_compat" to "service_role";

grant trigger on table "public"."profile_compat" to "service_role";

grant truncate on table "public"."profile_compat" to "service_role";

grant update on table "public"."profile_compat" to "service_role";

grant delete on table "public"."profile_content" to "anon";

grant insert on table "public"."profile_content" to "anon";

grant references on table "public"."profile_content" to "anon";

grant select on table "public"."profile_content" to "anon";

grant trigger on table "public"."profile_content" to "anon";

grant truncate on table "public"."profile_content" to "anon";

grant update on table "public"."profile_content" to "anon";

grant delete on table "public"."profile_content" to "authenticated";

grant insert on table "public"."profile_content" to "authenticated";

grant references on table "public"."profile_content" to "authenticated";

grant select on table "public"."profile_content" to "authenticated";

grant trigger on table "public"."profile_content" to "authenticated";

grant truncate on table "public"."profile_content" to "authenticated";

grant update on table "public"."profile_content" to "authenticated";

grant delete on table "public"."profile_content" to "service_role";

grant insert on table "public"."profile_content" to "service_role";

grant references on table "public"."profile_content" to "service_role";

grant select on table "public"."profile_content" to "service_role";

grant trigger on table "public"."profile_content" to "service_role";

grant truncate on table "public"."profile_content" to "service_role";

grant update on table "public"."profile_content" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."profiles_drafts" to "anon";

grant insert on table "public"."profiles_drafts" to "anon";

grant references on table "public"."profiles_drafts" to "anon";

grant select on table "public"."profiles_drafts" to "anon";

grant trigger on table "public"."profiles_drafts" to "anon";

grant truncate on table "public"."profiles_drafts" to "anon";

grant update on table "public"."profiles_drafts" to "anon";

grant delete on table "public"."profiles_drafts" to "authenticated";

grant insert on table "public"."profiles_drafts" to "authenticated";

grant references on table "public"."profiles_drafts" to "authenticated";

grant select on table "public"."profiles_drafts" to "authenticated";

grant trigger on table "public"."profiles_drafts" to "authenticated";

grant truncate on table "public"."profiles_drafts" to "authenticated";

grant update on table "public"."profiles_drafts" to "authenticated";

grant delete on table "public"."profiles_drafts" to "service_role";

grant insert on table "public"."profiles_drafts" to "service_role";

grant references on table "public"."profiles_drafts" to "service_role";

grant select on table "public"."profiles_drafts" to "service_role";

grant trigger on table "public"."profiles_drafts" to "service_role";

grant truncate on table "public"."profiles_drafts" to "service_role";

grant update on table "public"."profiles_drafts" to "service_role";

grant delete on table "public"."report_drafts" to "anon";

grant insert on table "public"."report_drafts" to "anon";

grant references on table "public"."report_drafts" to "anon";

grant select on table "public"."report_drafts" to "anon";

grant trigger on table "public"."report_drafts" to "anon";

grant truncate on table "public"."report_drafts" to "anon";

grant update on table "public"."report_drafts" to "anon";

grant delete on table "public"."report_drafts" to "authenticated";

grant insert on table "public"."report_drafts" to "authenticated";

grant references on table "public"."report_drafts" to "authenticated";

grant select on table "public"."report_drafts" to "authenticated";

grant trigger on table "public"."report_drafts" to "authenticated";

grant truncate on table "public"."report_drafts" to "authenticated";

grant update on table "public"."report_drafts" to "authenticated";

grant delete on table "public"."report_drafts" to "service_role";

grant insert on table "public"."report_drafts" to "service_role";

grant references on table "public"."report_drafts" to "service_role";

grant select on table "public"."report_drafts" to "service_role";

grant trigger on table "public"."report_drafts" to "service_role";

grant truncate on table "public"."report_drafts" to "service_role";

grant update on table "public"."report_drafts" to "service_role";

grant delete on table "public"."report_signoffs" to "anon";

grant insert on table "public"."report_signoffs" to "anon";

grant references on table "public"."report_signoffs" to "anon";

grant select on table "public"."report_signoffs" to "anon";

grant trigger on table "public"."report_signoffs" to "anon";

grant truncate on table "public"."report_signoffs" to "anon";

grant update on table "public"."report_signoffs" to "anon";

grant delete on table "public"."report_signoffs" to "authenticated";

grant insert on table "public"."report_signoffs" to "authenticated";

grant references on table "public"."report_signoffs" to "authenticated";

grant select on table "public"."report_signoffs" to "authenticated";

grant trigger on table "public"."report_signoffs" to "authenticated";

grant truncate on table "public"."report_signoffs" to "authenticated";

grant update on table "public"."report_signoffs" to "authenticated";

grant delete on table "public"."report_signoffs" to "service_role";

grant insert on table "public"."report_signoffs" to "service_role";

grant references on table "public"."report_signoffs" to "service_role";

grant select on table "public"."report_signoffs" to "service_role";

grant trigger on table "public"."report_signoffs" to "service_role";

grant truncate on table "public"."report_signoffs" to "service_role";

grant update on table "public"."report_signoffs" to "service_role";

grant delete on table "public"."report_templates" to "anon";

grant insert on table "public"."report_templates" to "anon";

grant references on table "public"."report_templates" to "anon";

grant select on table "public"."report_templates" to "anon";

grant trigger on table "public"."report_templates" to "anon";

grant truncate on table "public"."report_templates" to "anon";

grant update on table "public"."report_templates" to "anon";

grant delete on table "public"."report_templates" to "authenticated";

grant insert on table "public"."report_templates" to "authenticated";

grant references on table "public"."report_templates" to "authenticated";

grant select on table "public"."report_templates" to "authenticated";

grant trigger on table "public"."report_templates" to "authenticated";

grant truncate on table "public"."report_templates" to "authenticated";

grant update on table "public"."report_templates" to "authenticated";

grant delete on table "public"."report_templates" to "service_role";

grant insert on table "public"."report_templates" to "service_role";

grant references on table "public"."report_templates" to "service_role";

grant select on table "public"."report_templates" to "service_role";

grant trigger on table "public"."report_templates" to "service_role";

grant truncate on table "public"."report_templates" to "service_role";

grant update on table "public"."report_templates" to "service_role";

grant delete on table "public"."template_profile_content" to "anon";

grant insert on table "public"."template_profile_content" to "anon";

grant references on table "public"."template_profile_content" to "anon";

grant select on table "public"."template_profile_content" to "anon";

grant trigger on table "public"."template_profile_content" to "anon";

grant truncate on table "public"."template_profile_content" to "anon";

grant update on table "public"."template_profile_content" to "anon";

grant delete on table "public"."template_profile_content" to "authenticated";

grant insert on table "public"."template_profile_content" to "authenticated";

grant references on table "public"."template_profile_content" to "authenticated";

grant select on table "public"."template_profile_content" to "authenticated";

grant trigger on table "public"."template_profile_content" to "authenticated";

grant truncate on table "public"."template_profile_content" to "authenticated";

grant update on table "public"."template_profile_content" to "authenticated";

grant delete on table "public"."template_profile_content" to "service_role";

grant insert on table "public"."template_profile_content" to "service_role";

grant references on table "public"."template_profile_content" to "service_role";

grant select on table "public"."template_profile_content" to "service_role";

grant trigger on table "public"."template_profile_content" to "service_role";

grant truncate on table "public"."template_profile_content" to "service_role";

grant update on table "public"."template_profile_content" to "service_role";

grant delete on table "public"."template_profiles" to "anon";

grant insert on table "public"."template_profiles" to "anon";

grant references on table "public"."template_profiles" to "anon";

grant select on table "public"."template_profiles" to "anon";

grant trigger on table "public"."template_profiles" to "anon";

grant truncate on table "public"."template_profiles" to "anon";

grant update on table "public"."template_profiles" to "anon";

grant delete on table "public"."template_profiles" to "authenticated";

grant insert on table "public"."template_profiles" to "authenticated";

grant references on table "public"."template_profiles" to "authenticated";

grant select on table "public"."template_profiles" to "authenticated";

grant trigger on table "public"."template_profiles" to "authenticated";

grant truncate on table "public"."template_profiles" to "authenticated";

grant update on table "public"."template_profiles" to "authenticated";

grant delete on table "public"."template_profiles" to "service_role";

grant insert on table "public"."template_profiles" to "service_role";

grant references on table "public"."template_profiles" to "service_role";

grant select on table "public"."template_profiles" to "service_role";

grant trigger on table "public"."template_profiles" to "service_role";

grant truncate on table "public"."template_profiles" to "service_role";

grant update on table "public"."template_profiles" to "service_role";

grant delete on table "public"."template_questions" to "anon";

grant insert on table "public"."template_questions" to "anon";

grant references on table "public"."template_questions" to "anon";

grant select on table "public"."template_questions" to "anon";

grant trigger on table "public"."template_questions" to "anon";

grant truncate on table "public"."template_questions" to "anon";

grant update on table "public"."template_questions" to "anon";

grant delete on table "public"."template_questions" to "authenticated";

grant insert on table "public"."template_questions" to "authenticated";

grant references on table "public"."template_questions" to "authenticated";

grant select on table "public"."template_questions" to "authenticated";

grant trigger on table "public"."template_questions" to "authenticated";

grant truncate on table "public"."template_questions" to "authenticated";

grant update on table "public"."template_questions" to "authenticated";

grant delete on table "public"."template_questions" to "service_role";

grant insert on table "public"."template_questions" to "service_role";

grant references on table "public"."template_questions" to "service_role";

grant select on table "public"."template_questions" to "service_role";

grant trigger on table "public"."template_questions" to "service_role";

grant truncate on table "public"."template_questions" to "service_role";

grant update on table "public"."template_questions" to "service_role";

grant delete on table "public"."template_report_templates" to "anon";

grant insert on table "public"."template_report_templates" to "anon";

grant references on table "public"."template_report_templates" to "anon";

grant select on table "public"."template_report_templates" to "anon";

grant trigger on table "public"."template_report_templates" to "anon";

grant truncate on table "public"."template_report_templates" to "anon";

grant update on table "public"."template_report_templates" to "anon";

grant delete on table "public"."template_report_templates" to "authenticated";

grant insert on table "public"."template_report_templates" to "authenticated";

grant references on table "public"."template_report_templates" to "authenticated";

grant select on table "public"."template_report_templates" to "authenticated";

grant trigger on table "public"."template_report_templates" to "authenticated";

grant truncate on table "public"."template_report_templates" to "authenticated";

grant update on table "public"."template_report_templates" to "authenticated";

grant delete on table "public"."template_report_templates" to "service_role";

grant insert on table "public"."template_report_templates" to "service_role";

grant references on table "public"."template_report_templates" to "service_role";

grant select on table "public"."template_report_templates" to "service_role";

grant trigger on table "public"."template_report_templates" to "service_role";

grant truncate on table "public"."template_report_templates" to "service_role";

grant update on table "public"."template_report_templates" to "service_role";

grant delete on table "public"."templates" to "anon";

grant insert on table "public"."templates" to "anon";

grant references on table "public"."templates" to "anon";

grant select on table "public"."templates" to "anon";

grant trigger on table "public"."templates" to "anon";

grant truncate on table "public"."templates" to "anon";

grant update on table "public"."templates" to "anon";

grant delete on table "public"."templates" to "authenticated";

grant insert on table "public"."templates" to "authenticated";

grant references on table "public"."templates" to "authenticated";

grant select on table "public"."templates" to "authenticated";

grant trigger on table "public"."templates" to "authenticated";

grant truncate on table "public"."templates" to "authenticated";

grant update on table "public"."templates" to "authenticated";

grant delete on table "public"."templates" to "service_role";

grant insert on table "public"."templates" to "service_role";

grant references on table "public"."templates" to "service_role";

grant select on table "public"."templates" to "service_role";

grant trigger on table "public"."templates" to "service_role";

grant truncate on table "public"."templates" to "service_role";

grant update on table "public"."templates" to "service_role";

grant delete on table "public"."test_answers" to "anon";

grant insert on table "public"."test_answers" to "anon";

grant references on table "public"."test_answers" to "anon";

grant select on table "public"."test_answers" to "anon";

grant trigger on table "public"."test_answers" to "anon";

grant truncate on table "public"."test_answers" to "anon";

grant update on table "public"."test_answers" to "anon";

grant delete on table "public"."test_answers" to "authenticated";

grant insert on table "public"."test_answers" to "authenticated";

grant references on table "public"."test_answers" to "authenticated";

grant select on table "public"."test_answers" to "authenticated";

grant trigger on table "public"."test_answers" to "authenticated";

grant truncate on table "public"."test_answers" to "authenticated";

grant update on table "public"."test_answers" to "authenticated";

grant delete on table "public"."test_answers" to "service_role";

grant insert on table "public"."test_answers" to "service_role";

grant references on table "public"."test_answers" to "service_role";

grant select on table "public"."test_answers" to "service_role";

grant trigger on table "public"."test_answers" to "service_role";

grant truncate on table "public"."test_answers" to "service_role";

grant update on table "public"."test_answers" to "service_role";

grant delete on table "public"."test_deployments" to "anon";

grant insert on table "public"."test_deployments" to "anon";

grant references on table "public"."test_deployments" to "anon";

grant select on table "public"."test_deployments" to "anon";

grant trigger on table "public"."test_deployments" to "anon";

grant truncate on table "public"."test_deployments" to "anon";

grant update on table "public"."test_deployments" to "anon";

grant delete on table "public"."test_deployments" to "authenticated";

grant insert on table "public"."test_deployments" to "authenticated";

grant references on table "public"."test_deployments" to "authenticated";

grant select on table "public"."test_deployments" to "authenticated";

grant trigger on table "public"."test_deployments" to "authenticated";

grant truncate on table "public"."test_deployments" to "authenticated";

grant update on table "public"."test_deployments" to "authenticated";

grant delete on table "public"."test_deployments" to "service_role";

grant insert on table "public"."test_deployments" to "service_role";

grant references on table "public"."test_deployments" to "service_role";

grant select on table "public"."test_deployments" to "service_role";

grant trigger on table "public"."test_deployments" to "service_role";

grant truncate on table "public"."test_deployments" to "service_role";

grant update on table "public"."test_deployments" to "service_role";

grant delete on table "public"."test_links" to "anon";

grant insert on table "public"."test_links" to "anon";

grant references on table "public"."test_links" to "anon";

grant select on table "public"."test_links" to "anon";

grant trigger on table "public"."test_links" to "anon";

grant truncate on table "public"."test_links" to "anon";

grant update on table "public"."test_links" to "anon";

grant delete on table "public"."test_links" to "authenticated";

grant insert on table "public"."test_links" to "authenticated";

grant references on table "public"."test_links" to "authenticated";

grant select on table "public"."test_links" to "authenticated";

grant trigger on table "public"."test_links" to "authenticated";

grant truncate on table "public"."test_links" to "authenticated";

grant update on table "public"."test_links" to "authenticated";

grant delete on table "public"."test_links" to "service_role";

grant insert on table "public"."test_links" to "service_role";

grant references on table "public"."test_links" to "service_role";

grant select on table "public"."test_links" to "service_role";

grant trigger on table "public"."test_links" to "service_role";

grant truncate on table "public"."test_links" to "service_role";

grant update on table "public"."test_links" to "service_role";

grant delete on table "public"."test_options" to "anon";

grant insert on table "public"."test_options" to "anon";

grant references on table "public"."test_options" to "anon";

grant select on table "public"."test_options" to "anon";

grant trigger on table "public"."test_options" to "anon";

grant truncate on table "public"."test_options" to "anon";

grant update on table "public"."test_options" to "anon";

grant delete on table "public"."test_options" to "authenticated";

grant insert on table "public"."test_options" to "authenticated";

grant references on table "public"."test_options" to "authenticated";

grant select on table "public"."test_options" to "authenticated";

grant trigger on table "public"."test_options" to "authenticated";

grant truncate on table "public"."test_options" to "authenticated";

grant update on table "public"."test_options" to "authenticated";

grant delete on table "public"."test_options" to "service_role";

grant insert on table "public"."test_options" to "service_role";

grant references on table "public"."test_options" to "service_role";

grant select on table "public"."test_options" to "service_role";

grant trigger on table "public"."test_options" to "service_role";

grant truncate on table "public"."test_options" to "service_role";

grant update on table "public"."test_options" to "service_role";

grant delete on table "public"."test_questions" to "anon";

grant insert on table "public"."test_questions" to "anon";

grant references on table "public"."test_questions" to "anon";

grant select on table "public"."test_questions" to "anon";

grant trigger on table "public"."test_questions" to "anon";

grant truncate on table "public"."test_questions" to "anon";

grant update on table "public"."test_questions" to "anon";

grant delete on table "public"."test_questions" to "authenticated";

grant insert on table "public"."test_questions" to "authenticated";

grant references on table "public"."test_questions" to "authenticated";

grant select on table "public"."test_questions" to "authenticated";

grant trigger on table "public"."test_questions" to "authenticated";

grant truncate on table "public"."test_questions" to "authenticated";

grant update on table "public"."test_questions" to "authenticated";

grant delete on table "public"."test_questions" to "service_role";

grant insert on table "public"."test_questions" to "service_role";

grant references on table "public"."test_questions" to "service_role";

grant select on table "public"."test_questions" to "service_role";

grant trigger on table "public"."test_questions" to "service_role";

grant truncate on table "public"."test_questions" to "service_role";

grant update on table "public"."test_questions" to "service_role";

grant delete on table "public"."test_results" to "anon";

grant insert on table "public"."test_results" to "anon";

grant references on table "public"."test_results" to "anon";

grant select on table "public"."test_results" to "anon";

grant trigger on table "public"."test_results" to "anon";

grant truncate on table "public"."test_results" to "anon";

grant update on table "public"."test_results" to "anon";

grant delete on table "public"."test_results" to "authenticated";

grant insert on table "public"."test_results" to "authenticated";

grant references on table "public"."test_results" to "authenticated";

grant select on table "public"."test_results" to "authenticated";

grant trigger on table "public"."test_results" to "authenticated";

grant truncate on table "public"."test_results" to "authenticated";

grant update on table "public"."test_results" to "authenticated";

grant delete on table "public"."test_results" to "service_role";

grant insert on table "public"."test_results" to "service_role";

grant references on table "public"."test_results" to "service_role";

grant select on table "public"."test_results" to "service_role";

grant trigger on table "public"."test_results" to "service_role";

grant truncate on table "public"."test_results" to "service_role";

grant update on table "public"."test_results" to "service_role";

grant delete on table "public"."test_submissions" to "anon";

grant insert on table "public"."test_submissions" to "anon";

grant references on table "public"."test_submissions" to "anon";

grant select on table "public"."test_submissions" to "anon";

grant trigger on table "public"."test_submissions" to "anon";

grant truncate on table "public"."test_submissions" to "anon";

grant update on table "public"."test_submissions" to "anon";

grant delete on table "public"."test_submissions" to "authenticated";

grant insert on table "public"."test_submissions" to "authenticated";

grant references on table "public"."test_submissions" to "authenticated";

grant select on table "public"."test_submissions" to "authenticated";

grant trigger on table "public"."test_submissions" to "authenticated";

grant truncate on table "public"."test_submissions" to "authenticated";

grant update on table "public"."test_submissions" to "authenticated";

grant delete on table "public"."test_submissions" to "service_role";

grant insert on table "public"."test_submissions" to "service_role";

grant references on table "public"."test_submissions" to "service_role";

grant select on table "public"."test_submissions" to "service_role";

grant trigger on table "public"."test_submissions" to "service_role";

grant truncate on table "public"."test_submissions" to "service_role";

grant update on table "public"."test_submissions" to "service_role";

grant delete on table "public"."test_takers" to "anon";

grant insert on table "public"."test_takers" to "anon";

grant references on table "public"."test_takers" to "anon";

grant select on table "public"."test_takers" to "anon";

grant trigger on table "public"."test_takers" to "anon";

grant truncate on table "public"."test_takers" to "anon";

grant update on table "public"."test_takers" to "anon";

grant delete on table "public"."test_takers" to "authenticated";

grant insert on table "public"."test_takers" to "authenticated";

grant references on table "public"."test_takers" to "authenticated";

grant select on table "public"."test_takers" to "authenticated";

grant trigger on table "public"."test_takers" to "authenticated";

grant truncate on table "public"."test_takers" to "authenticated";

grant update on table "public"."test_takers" to "authenticated";

grant delete on table "public"."test_takers" to "service_role";

grant insert on table "public"."test_takers" to "service_role";

grant references on table "public"."test_takers" to "service_role";

grant select on table "public"."test_takers" to "service_role";

grant trigger on table "public"."test_takers" to "service_role";

grant truncate on table "public"."test_takers" to "service_role";

grant update on table "public"."test_takers" to "service_role";

grant delete on table "public"."tests" to "anon";

grant insert on table "public"."tests" to "anon";

grant references on table "public"."tests" to "anon";

grant select on table "public"."tests" to "anon";

grant trigger on table "public"."tests" to "anon";

grant truncate on table "public"."tests" to "anon";

grant update on table "public"."tests" to "anon";

grant delete on table "public"."tests" to "authenticated";

grant insert on table "public"."tests" to "authenticated";

grant references on table "public"."tests" to "authenticated";

grant select on table "public"."tests" to "authenticated";

grant trigger on table "public"."tests" to "authenticated";

grant truncate on table "public"."tests" to "authenticated";

grant update on table "public"."tests" to "authenticated";

grant delete on table "public"."tests" to "service_role";

grant insert on table "public"."tests" to "service_role";

grant references on table "public"."tests" to "service_role";

grant select on table "public"."tests" to "service_role";

grant trigger on table "public"."tests" to "service_role";

grant truncate on table "public"."tests" to "service_role";

grant update on table "public"."tests" to "service_role";


  create policy "members read branding"
  on "public"."brand_settings"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = brand_settings.org_id) AND (m.user_id = auth.uid())))));



  create policy "members read framework"
  on "public"."framework_settings"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = framework_settings.org_id) AND (m.user_id = auth.uid())))));



  create policy "brand_rw"
  on "public"."org_brand_settings"
  as permissive
  for all
  to authenticated
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "obs_rw"
  on "public"."org_brand_settings"
  as permissive
  for all
  to public
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "org_frameworks_auth_rw"
  on "public"."org_frameworks"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "members_all"
  on "public"."org_members"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "members_delete"
  on "public"."org_members"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members m
  WHERE ((m.org_id = org_members.org_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "members_insert"
  on "public"."org_members"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "members_select"
  on "public"."org_members"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR public.is_member(org_id)));



  create policy "members_update"
  on "public"."org_members"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members m
  WHERE ((m.org_id = org_members.org_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "membership self read"
  on "public"."org_memberships"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "onboarding read"
  on "public"."org_onboarding"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = org_onboarding.org_id) AND (m.user_id = auth.uid())))));



  create policy "org read onboarding"
  on "public"."org_onboarding"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = org_onboarding.org_id) AND (m.user_id = auth.uid())))));



  create policy "org write onboarding"
  on "public"."org_onboarding"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = org_onboarding.org_id) AND (m.user_id = auth.uid())))));



  create policy "org_onboarding_auth_rw"
  on "public"."org_onboarding"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "org_onboarding_owner_rw"
  on "public"."org_onboarding"
  as permissive
  for all
  to public
using ((org_id = auth.uid()))
with check ((org_id = auth.uid()));



  create policy "org_profile_codes_read"
  on "public"."org_profile_codes"
  as permissive
  for select
  to public
using (public.is_member(org_id));



  create policy "org_profile_codes_rw"
  on "public"."org_profile_codes"
  as permissive
  for all
  to authenticated
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "compat modify"
  on "public"."org_profile_compatibility"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_frameworks f
  WHERE ((f.id = org_profile_compatibility.framework_id) AND (public.org_owner(f.org_id) = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.org_frameworks f
  WHERE ((f.id = org_profile_compatibility.framework_id) AND (public.org_owner(f.org_id) = auth.uid())))));



  create policy "compat select"
  on "public"."org_profile_compatibility"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_frameworks f
  WHERE ((f.id = org_profile_compatibility.framework_id) AND (public.org_owner(f.org_id) = auth.uid())))));



  create policy "org_profile_reports_all_auth"
  on "public"."org_profile_reports"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "members read org profile"
  on "public"."org_profiles"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = org_profiles.org_id) AND (m.user_id = auth.uid())))));



  create policy "org_profiles_auth_rw"
  on "public"."org_profiles"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "org_profiles_read"
  on "public"."org_profiles"
  as permissive
  for select
  to public
using (public.is_member(org_id));



  create policy "drafts-service-insert"
  on "public"."org_report_drafts"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "org_tests_all"
  on "public"."org_tests"
  as permissive
  for all
  to public
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "org_tests_member"
  on "public"."org_tests"
  as permissive
  for select
  to public
using (public.is_member(org_id));



  create policy "org_tests_rw"
  on "public"."org_tests"
  as permissive
  for all
  to authenticated
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "orgs by members"
  on "public"."organizations"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = organizations.id) AND (m.user_id = auth.uid())))));



  create policy "orgs_insert"
  on "public"."organizations"
  as permissive
  for insert
  to public
with check ((auth.uid() = created_by));



  create policy "orgs_modify"
  on "public"."organizations"
  as permissive
  for all
  to public
using (public.is_member(id))
with check (public.is_member(id));



  create policy "orgs_select"
  on "public"."organizations"
  as permissive
  for select
  to public
using (public.is_member(id));



  create policy "orgs_update"
  on "public"."organizations"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members m
  WHERE ((m.org_id = organizations.id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "read all"
  on "public"."organizations"
  as permissive
  for select
  to public
using (true);



  create policy "invites_read"
  on "public"."portal_invites"
  as permissive
  for select
  to public
using (public.is_member(org_id));



  create policy "invites_write"
  on "public"."portal_invites"
  as permissive
  for insert
  to authenticated
with check (public.is_member(org_id));



  create policy "pm_all"
  on "public"."portal_members"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "compat read"
  on "public"."profile_compat"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = profile_compat.org_id) AND (m.user_id = auth.uid())))));



  create policy "profile_content read"
  on "public"."profile_content"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = profile_content.org_id) AND (m.user_id = auth.uid())))));



  create policy "profiles read"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = profiles.org_id) AND (m.user_id = auth.uid())))));



  create policy "drafts_all"
  on "public"."report_drafts"
  as permissive
  for all
  to public
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "signoffs_all"
  on "public"."report_signoffs"
  as permissive
  for all
  to public
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "report_templates read"
  on "public"."report_templates"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = report_templates.org_id) AND (m.user_id = auth.uid())))));



  create policy "read answers"
  on "public"."test_answers"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.tests t
     JOIN public.org_memberships m ON ((m.org_id = t.org_id)))
  WHERE ((t.id = test_answers.test_id) AND (m.user_id = auth.uid())))));



  create policy "allow read by slug"
  on "public"."test_deployments"
  as permissive
  for select
  to public
using (true);



  create policy "links readable by members"
  on "public"."test_links"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.tests t
     JOIN public.org_memberships m ON ((m.org_id = t.org_id)))
  WHERE ((t.id = test_links.test_id) AND (m.user_id = auth.uid())))));



  create policy "test_options_rw"
  on "public"."test_options"
  as permissive
  for all
  to authenticated
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "to_all"
  on "public"."test_options"
  as permissive
  for all
  to public
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "read questions"
  on "public"."test_questions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.tests t
     JOIN public.org_memberships m ON ((m.org_id = t.org_id)))
  WHERE ((t.id = test_questions.test_id) AND (m.user_id = auth.uid())))));



  create policy "test_questions_rw"
  on "public"."test_questions"
  as permissive
  for all
  to authenticated
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "tq_all"
  on "public"."test_questions"
  as permissive
  for all
  to public
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "subs_all"
  on "public"."test_submissions"
  as permissive
  for all
  to public
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "test_submissions_member"
  on "public"."test_submissions"
  as permissive
  for select
  to public
using (public.is_member(org_id));



  create policy "takers readable by members"
  on "public"."test_takers"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.tests t
     JOIN public.org_memberships m ON ((m.org_id = t.org_id)))
  WHERE ((t.id = test_takers.test_id) AND (m.user_id = auth.uid())))));



  create policy "takers_all"
  on "public"."test_takers"
  as permissive
  for all
  to public
using (public.is_member(org_id))
with check (public.is_member(org_id));



  create policy "test_takers_member"
  on "public"."test_takers"
  as permissive
  for select
  to public
using (public.is_member(org_id));



  create policy "tests readable by members"
  on "public"."tests"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_memberships m
  WHERE ((m.org_id = tests.org_id) AND (m.user_id = auth.uid())))));


CREATE TRIGGER trg_org_onboarding_updated BEFORE UPDATE ON public.org_onboarding FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_organizations_autofill BEFORE INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.organizations_autofill();

CREATE TRIGGER trg_set_org_owner BEFORE INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_org_owner();

CREATE TRIGGER trg_profiles_drafts_updated_at BEFORE UPDATE ON public.profiles_drafts FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER trg_tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


  create policy "branding-auth-delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'branding'::text));



  create policy "branding-auth-insert"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'branding'::text));



  create policy "branding-auth-update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'branding'::text));



  create policy "branding-auth-write"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'branding'::text));



  create policy "branding-public-read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'branding'::text));



  create policy "branding-read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'branding'::text));



