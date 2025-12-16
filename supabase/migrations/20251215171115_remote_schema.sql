


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."broadcast_message_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_author_name text;
  v_author_image_url text;
begin
  select up.name, up.image_url
    into v_author_name, v_author_image_url
  from public.user_profile as up
  where up.id = new.author_id;

  perform realtime.send(
    jsonb_build_object(
      'id', new.id,
      'text', new.text,
      'created_at', new.created_at,
      'author_id', new.author_id,
      'author_name', v_author_name,
      'author_image_url', v_author_image_url
    ),
    'message_created',
    'room:' || new.chat_room_id::text || ':messages',
    false  -- make event public so any subscribed client can receive it
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."broadcast_message_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  user_name text;
  user_email text;
  avatar_url text;
begin
  -- extract user email from auth.users
  user_email := new.email;
  
  -- extract name from raw_user_meta_data if available
  -- check for preferred_username, name, full_name, or fallback to email
  if new.raw_user_meta_data is not null and new.raw_user_meta_data->>'preferred_username' is not null then
    user_name := new.raw_user_meta_data->>'preferred_username';
  elsif new.raw_user_meta_data is not null and new.raw_user_meta_data->>'name' is not null then
    user_name := new.raw_user_meta_data->>'name';
  elsif new.raw_user_meta_data is not null and new.raw_user_meta_data->>'full_name' is not null then
    user_name := new.raw_user_meta_data->>'full_name';
  else
    -- fallback to email if no name is provided
    user_name := coalesce(user_email, 'User');
  end if;
  
  -- extract avatar_url from github oauth metadata
  -- github provides avatar_url in raw_user_meta_data
  if new.raw_user_meta_data is not null then
    -- try avatar_url first (github standard)
    if new.raw_user_meta_data->>'avatar_url' is not null then
      avatar_url := new.raw_user_meta_data->>'avatar_url';
    -- fallback to picture (some oauth providers use this)
    elsif new.raw_user_meta_data->>'picture' is not null then
      avatar_url := new.raw_user_meta_data->>'picture';
    end if;
  end if;
  
  -- insert into public.user_profile
  -- id matches auth.users.id to maintain referential integrity
  insert into public.user_profile (id, name, image_url, created_at)
  values (
    new.id,
    user_name,
    avatar_url, -- set avatar_url from github metadata, or null if not available
    now()
  );
  
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_room" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying NOT NULL,
    "is_public" boolean NOT NULL
);


ALTER TABLE "public"."chat_room" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_room_member" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "member_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_room_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."chat_room_member" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "text" "text" NOT NULL,
    "chat_room_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL
);


ALTER TABLE "public"."message" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying NOT NULL,
    "image_url" character varying,
    "external_user_id" "uuid"
);


ALTER TABLE "public"."user_profile" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profile"."external_user_id" IS 'ID of the user in the external Express auth service';



ALTER TABLE ONLY "public"."chat_room_member"
    ADD CONSTRAINT "chat_room_member_pkey" PRIMARY KEY ("member_id", "chat_room_id");



ALTER TABLE ONLY "public"."chat_room"
    ADD CONSTRAINT "chat_room_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "broadcast_message_insert" AFTER INSERT ON "public"."message" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_message_insert"();



ALTER TABLE ONLY "public"."chat_room_member"
    ADD CONSTRAINT "chat_room_member_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "public"."chat_room"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_room_member"
    ADD CONSTRAINT "chat_room_member_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."user_profile"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."user_profile"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "public"."chat_room"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Users can add themselves to public chat rooms" ON "public"."chat_room_member" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "member_id") AND ("chat_room_id" IN ( SELECT "chat_room"."id"
   FROM "public"."chat_room"
  WHERE ("chat_room"."is_public" = true)))));



CREATE POLICY "Users can read all public rooms" ON "public"."chat_room" FOR SELECT TO "authenticated" USING (("is_public" = true));



CREATE POLICY "Users can read their own membership rows" ON "public"."chat_room_member" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "member_id"));



CREATE POLICY "Users can remove themselves from rooms" ON "public"."chat_room_member" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "member_id"));



ALTER TABLE "public"."chat_room" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_room_member" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."broadcast_message_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."broadcast_message_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."broadcast_message_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."chat_room" TO "anon";
GRANT ALL ON TABLE "public"."chat_room" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_room" TO "service_role";



GRANT ALL ON TABLE "public"."chat_room_member" TO "anon";
GRANT ALL ON TABLE "public"."chat_room_member" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_room_member" TO "service_role";



GRANT ALL ON TABLE "public"."message" TO "anon";
GRANT ALL ON TABLE "public"."message" TO "authenticated";
GRANT ALL ON TABLE "public"."message" TO "service_role";



GRANT ALL ON TABLE "public"."user_profile" TO "anon";
GRANT ALL ON TABLE "public"."user_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profile" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Members can publish to their rooms"
  on "realtime"."messages"
  as permissive
  for insert
  to authenticated
with check (((topic ~~ 'room:%:messages'::text) AND (split_part(topic, ':'::text, 2) IN ( SELECT (chat_room_member.chat_room_id)::text AS chat_room_id
   FROM public.chat_room_member
  WHERE (chat_room_member.member_id = ( SELECT auth.uid() AS uid))))));



  create policy "Members can receive from their rooms"
  on "realtime"."messages"
  as permissive
  for select
  to authenticated
using (((topic ~~ 'room:%:messages'::text) AND (split_part(topic, ':'::text, 2) IN ( SELECT (chat_room_member.chat_room_id)::text AS chat_room_id
   FROM public.chat_room_member
  WHERE (chat_room_member.member_id = ( SELECT auth.uid() AS uid))))));



