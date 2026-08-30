-- Pulse, live world snapshot board
-- schema.sql
-- Run this once in the Supabase SQL editor to set up the three tables.

-- 1. Earthquakes
-- USGS gives every earthquake a permanent unique id like "us7000abcd",
-- so this is a real dedupe case, the same quake can come back in later
-- pulls with an updated magnitude as more sensors report in, and I want
-- the row to update in place instead of stacking up duplicates.
create table if not exists earthquakes (
  id text primary key,
  magnitude numeric,
  place text,
  latitude numeric,
  longitude numeric,
  depth_km numeric,
  quake_time timestamptz,
  updated_at timestamptz not null default now()
);

-- 2. Weather
-- Open Meteo does not give me a reading id, it just gives me "the
-- weather right now" for whatever coordinates I ask for. So instead of
-- an id from the API, I made the city name itself the primary key.
-- Every fetch overwrites that city's single row with the latest reading,
-- which is exactly the "show what's happening right now" behaviour I want,
-- one current row per place instead of a growing history table.
create table if not exists weather_current (
  city text primary key,
  latitude numeric,
  longitude numeric,
  temperature_c numeric,
  windspeed_kmh numeric,
  weathercode int,
  observed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 3. ISS position
-- There is only ever one ISS and one "current position", so this table
-- only ever holds a single row. I forced the id to always be 1 so every
-- fetch just overwrites that same row with the latest coordinates.
create table if not exists iss_position (
  id int primary key default 1,
  latitude numeric,
  longitude numeric,
  observed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint only_one_row check (id = 1)
);

-- Row level security, turned on so the anon key used by the webpage
-- can only ever read, never write. Writing only happens from fetch.js
-- using the service role key, which skips RLS entirely.
alter table earthquakes enable row level security;
alter table weather_current enable row level security;
alter table iss_position enable row level security;

create policy "public can read earthquakes" on earthquakes
  for select using (true);
create policy "public can read weather" on weather_current
  for select using (true);
create policy "public can read iss position" on iss_position
  for select using (true);
