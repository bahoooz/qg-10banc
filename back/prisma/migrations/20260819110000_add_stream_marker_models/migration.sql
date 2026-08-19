-- CreateTable
CREATE TABLE "streamers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "twitch_login" TEXT NOT NULL,
    "twitch_user_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "streamers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_sessions" (
    "id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "twitch_stream_id" TEXT NOT NULL,
    "title" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "vod_video_id" TEXT,
    "vod_url" TEXT,

    CONSTRAINT "stream_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markers" (
    "id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "session_id" TEXT,
    "pressed_at" TIMESTAMP(3) NOT NULL,
    "obs_stream_offset_ms" BIGINT NOT NULL,
    "obs_timecode" TEXT,
    "obs_scene" TEXT,
    "window_before_ms" INTEGER NOT NULL,
    "window_after_ms" INTEGER NOT NULL,
    "thumbnail_path" TEXT,
    "client_version" TEXT,
    "vod_offset_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "markers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stream_sessions_twitch_stream_id_key" ON "stream_sessions"("twitch_stream_id");

-- CreateIndex
CREATE INDEX "stream_sessions_streamer_id_started_at_idx" ON "stream_sessions"("streamer_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "markers_session_id_obs_stream_offset_ms_idx" ON "markers"("session_id", "obs_stream_offset_ms");

-- CreateIndex
CREATE INDEX "markers_streamer_id_pressed_at_idx" ON "markers"("streamer_id", "pressed_at" DESC);

-- AddForeignKey
ALTER TABLE "stream_sessions" ADD CONSTRAINT "stream_sessions_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markers" ADD CONSTRAINT "markers_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markers" ADD CONSTRAINT "markers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "stream_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed streamers (menu client StreamMarker)
INSERT INTO "streamers" ("id", "name", "twitch_login", "active") VALUES
  ('test', 'test', 'test', true),
  ('mollyyswd', 'Mollyyswd', 'mollyyswd', true),
  ('lapatatemusclee', 'LaPatateMusclee', 'lapatatemusclee', true)
ON CONFLICT ("id") DO NOTHING;
