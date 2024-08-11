BEGIN;
--
-- Create model GameSchedule
--
CREATE TABLE "game_gameschedule" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "game_id" integer NULL, "game_mode" varchar(20) NULL, "round" integer unsigned NOT NULL CHECK ("round" >= 0), "is_active" bool NOT NULL, "scheduled" datetime NULL, "timestamp" datetime NOT NULL, "player_one_id" bigint NOT NULL REFERENCES "user_player" ("id") DEFERRABLE INITIALLY DEFERRED, "player_two_id" bigint NOT NULL REFERENCES "user_player" ("id") DEFERRABLE INITIALLY DEFERRED);
--
-- Create model GameResults
--
CREATE TABLE "game_gameresults" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "player_one_score" integer NOT NULL, "player_two_score" integer NOT NULL, "timestamp" datetime NOT NULL, "loser_id" bigint NULL REFERENCES "user_useraccount" ("id") DEFERRABLE INITIALLY DEFERRED, "winner_id" bigint NULL REFERENCES "user_useraccount" ("id") DEFERRABLE INITIALLY DEFERRED, "game_schedule_id" bigint NOT NULL REFERENCES "game_gameschedule" ("id") DEFERRABLE INITIALLY DEFERRED);
--
-- Add field tournament to gameschedule
--
ALTER TABLE "game_gameschedule" ADD COLUMN "tournament_id" bigint NULL REFERENCES "game_tournament" ("id") DEFERRABLE INITIALLY DEFERRED;
--
-- Create model TournamentLobby
--
CREATE TABLE "game_tournamentlobby" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "tournament_id" bigint NOT NULL REFERENCES "game_tournament" ("id") DEFERRABLE INITIALLY DEFERRED);
CREATE TABLE "game_tournamentlobby_losers" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "tournamentlobby_id" bigint NOT NULL REFERENCES "game_tournamentlobby" ("id") DEFERRABLE INITIALLY DEFERRED, "player_id" bigint NOT NULL REFERENCES "user_player" ("id") DEFERRABLE INITIALLY DEFERRED);
CREATE TABLE "game_tournamentlobby_winners" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "tournamentlobby_id" bigint NOT NULL REFERENCES "game_tournamentlobby" ("id") DEFERRABLE INITIALLY DEFERRED, "player_id" bigint NOT NULL REFERENCES "user_player" ("id") DEFERRABLE INITIALLY DEFERRED);

CREATE INDEX "game_gameschedule_player_one_id_68587b73" ON "game_gameschedule" ("player_one_id");
CREATE INDEX "game_gameschedule_player_two_id_f05b60e9" ON "game_gameschedule" ("player_two_id");
CREATE INDEX "game_gameresults_loser_id_eec5d331" ON "game_gameresults" ("loser_id");
CREATE INDEX "game_gameresults_winner_id_6ccee347" ON "game_gameresults" ("winner_id");
CREATE INDEX "game_gameresults_game_schedule_id_5445cc12" ON "game_gameresults" ("game_schedule_id");
CREATE INDEX "game_gameschedule_tournament_id_ff9f3daf" ON "game_gameschedule" ("tournament_id");
CREATE INDEX "game_tournamentlobby_tournament_id_c7a8ae39" ON "game_tournamentlobby" ("tournament_id");
CREATE UNIQUE INDEX "game_tournamentlobby_losers_tournamentlobby_id_player_id_33edb6bb_uniq" ON "game_tournamentlobby_losers" ("tournamentlobby_id", "player_id");
CREATE INDEX "game_tournamentlobby_losers_tournamentlobby_id_c0b696b8" ON "game_tournamentlobby_losers" ("tournamentlobby_id");
CREATE INDEX "game_tournamentlobby_losers_player_id_e2140040" ON "game_tournamentlobby_losers" ("player_id");
CREATE UNIQUE INDEX "game_tournamentlobby_winners_tournamentlobby_id_player_id_5d5cfff0_uniq" ON "game_tournamentlobby_winners" ("tournamentlobby_id", "player_id");
CREATE INDEX "game_tournamentlobby_winners_tournamentlobby_id_267b7b40" ON "game_tournamentlobby_winners" ("tournamentlobby_id");
CREATE INDEX "game_tournamentlobby_winners_player_id_5ede28fa" ON "game_tournamentlobby_winners" ("player_id");
COMMIT;
