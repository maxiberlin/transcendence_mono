BEGIN;
--
-- Create model Application
--
CREATE TABLE "oauth2_provider_application" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "client_id" varchar(100) NOT NULL UNIQUE, "redirect_uris" text NOT NULL, "client_type" varchar(32) NOT NULL, "authorization_grant_type" varchar(32) NOT NULL, "client_secret" varchar(255) NOT NULL, "name" varchar(255) NOT NULL, "user_id" bigint NULL REFERENCES "user_useraccount" ("id") DEFERRABLE INITIALLY DEFERRED, "skip_authorization" bool NOT NULL, "created" datetime NOT NULL, "updated" datetime NOT NULL);
--
-- Create model AccessToken
--
CREATE TABLE "oauth2_provider_accesstoken" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "token" varchar(255) NOT NULL UNIQUE, "expires" datetime NOT NULL, "scope" text NOT NULL, "application_id" bigint NULL REFERENCES "oauth2_provider_application" ("id") DEFERRABLE INITIALLY DEFERRED, "user_id" bigint NULL REFERENCES "user_useraccount" ("id") DEFERRABLE INITIALLY DEFERRED, "created" datetime NOT NULL, "updated" datetime NOT NULL);
--
-- Create model Grant
--
CREATE TABLE "oauth2_provider_grant" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "code" varchar(255) NOT NULL UNIQUE, "expires" datetime NOT NULL, "redirect_uri" varchar(255) NOT NULL, "scope" text NOT NULL, "application_id" bigint NOT NULL REFERENCES "oauth2_provider_application" ("id") DEFERRABLE INITIALLY DEFERRED, "user_id" bigint NOT NULL REFERENCES "user_useraccount" ("id") DEFERRABLE INITIALLY DEFERRED, "created" datetime NOT NULL, "updated" datetime NOT NULL);
--
-- Create model RefreshToken
--
CREATE TABLE "oauth2_provider_refreshtoken" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "token" varchar(255) NOT NULL, "access_token_id" bigint NULL UNIQUE REFERENCES "oauth2_provider_accesstoken" ("id") DEFERRABLE INITIALLY DEFERRED, "application_id" bigint NOT NULL REFERENCES "oauth2_provider_application" ("id") DEFERRABLE INITIALLY DEFERRED, "user_id" bigint NOT NULL REFERENCES "user_useraccount" ("id") DEFERRABLE INITIALLY DEFERRED, "created" datetime NOT NULL, "updated" datetime NOT NULL, "revoked" datetime NULL);
--
-- Add field source_refresh_token to AccessToken
--
CREATE TABLE "new__oauth2_provider_accesstoken" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "token" varchar(255) NOT NULL UNIQUE, "expires" datetime NOT NULL, "scope" text NOT NULL, "application_id" bigint NULL REFERENCES "oauth2_provider_application" ("id") DEFERRABLE INITIALLY DEFERRED, "user_id" bigint NULL REFERENCES "user_useraccount" ("id") DEFERRABLE INITIALLY DEFERRED, "created" datetime NOT NULL, "updated" datetime NOT NULL, "source_refresh_token_id" bigint NULL UNIQUE REFERENCES "oauth2_provider_refreshtoken" ("id") DEFERRABLE INITIALLY DEFERRED);
INSERT INTO "new__oauth2_provider_accesstoken" ("id", "token", "expires", "scope", "application_id", "user_id", "created", "updated", "source_refresh_token_id") SELECT "id", "token", "expires", "scope", "application_id", "user_id", "created", "updated", NULL FROM "oauth2_provider_accesstoken";
DROP TABLE "oauth2_provider_accesstoken";
ALTER TABLE "new__oauth2_provider_accesstoken" RENAME TO "oauth2_provider_accesstoken";
CREATE INDEX "oauth2_provider_application_client_secret_53133678" ON "oauth2_provider_application" ("client_secret");
CREATE INDEX "oauth2_provider_application_user_id_79829054" ON "oauth2_provider_application" ("user_id");
CREATE INDEX "oauth2_provider_grant_application_id_81923564" ON "oauth2_provider_grant" ("application_id");
CREATE INDEX "oauth2_provider_grant_user_id_e8f62af8" ON "oauth2_provider_grant" ("user_id");
CREATE UNIQUE INDEX "oauth2_provider_refreshtoken_token_revoked_af8a5134_uniq" ON "oauth2_provider_refreshtoken" ("token", "revoked");
CREATE INDEX "oauth2_provider_refreshtoken_application_id_2d1c311b" ON "oauth2_provider_refreshtoken" ("application_id");
CREATE INDEX "oauth2_provider_refreshtoken_user_id_da837fce" ON "oauth2_provider_refreshtoken" ("user_id");
CREATE INDEX "oauth2_provider_accesstoken_application_id_b22886e1" ON "oauth2_provider_accesstoken" ("application_id");
CREATE INDEX "oauth2_provider_accesstoken_user_id_6e4c9a65" ON "oauth2_provider_accesstoken" ("user_id");
COMMIT;
