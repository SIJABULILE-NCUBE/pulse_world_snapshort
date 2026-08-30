// fetch.js
// This is the script that actually goes and gets the live data.
// Run it with: node fetch.js
// It's meant to be run again and again (every few minutes, or on a cron job
// somewhere), that's the whole point of the upsert trick, running it twice
// should never leave you with duplicate rows.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// I'm using the service role key here, not the anon key, because this
// script needs to write to the database. The service role key skips
// row level security, which is fine because this only ever runs on my
// machine (or a server), never in the browser.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// A small, fixed list of cities to check the weather for. I picked these
// by hand instead of geocoding a city name through another API, one less
// thing that can go wrong for this project.
const CITIES = [
  { city: "Johannesburg", latitude: -26.2041, longitude: 28.0473 },
  { city: "London", latitude: 51.5072, longitude: -0.1276 },
  { city: "New York", latitude: 40.7128, longitude: -74.006 },
  { city: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
  { city: "Sydney", latitude: -33.8688, longitude: 151.2093 },
];

// --- 1. Earthquakes, straight from USGS -----------------------------
async function fetchEarthquakes() {
  console.log("Fetching earthquakes from USGS...");

  // all_day.geojson gives us every earthquake USGS has recorded in the
  // last 24 hours, worldwide, no key needed.
  const url =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
  const res = await fetch(url);
  const data = await res.json();

  // Turn each GeoJSON feature into a row that matches my table.
  const rows = data.features.map((quake) => ({
    id: quake.id,
    magnitude: quake.properties.mag,
    place: quake.properties.place,
    // geometry.coordinates comes as [longitude, latitude, depth]
    longitude: quake.geometry.coordinates[0],
    latitude: quake.geometry.coordinates[1],
    depth_km: quake.geometry.coordinates[2],
    quake_time: new Date(quake.properties.time).toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // This is the upsert. "id" is the conflict target, if a row with that
  // id already exists, Supabase updates it instead of erroring out or
  // making a duplicate.
  const { error } = await supabase
    .from("earthquakes")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;
  console.log(`Saved ${rows.length} earthquakes.`);
}

// --- 2. Weather, one call per city, from Open-Meteo ------------------
async function fetchWeather() {
  console.log("Fetching weather...");

  const rows = [];

  for (const place of CITIES) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true`;
    const res = await fetch(url);
    const data = await res.json();
    const current = data.current_weather;

    rows.push({
      city: place.city,
      latitude: place.latitude,
      longitude: place.longitude,
      temperature_c: current.temperature,
      windspeed_kmh: current.windspeed,
      weathercode: current.weathercode,
      observed_at: new Date(current.time).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Upsert on "city", so each city always has exactly one row, the
  // latest reading for that place.
  const { error } = await supabase
    .from("weather_current")
    .upsert(rows, { onConflict: "city" });

  if (error) throw error;
  console.log(`Saved weather for ${rows.length} cities.`);
}

// --- 3. Where the ISS is right now, from Open Notify ------------------
async function fetchIss() {
  console.log("Fetching ISS position...");

  const url = "http://api.open-notify.org/iss-now.json";
  const res = await fetch(url);
  const data = await res.json();

  const row = {
    id: 1, // always the same row, there's only one ISS
    latitude: parseFloat(data.iss_position.latitude),
    longitude: parseFloat(data.iss_position.longitude),
    observed_at: new Date(data.timestamp * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("iss_position")
    .upsert([row], { onConflict: "id" });

  if (error) throw error;
  console.log("Saved ISS position.");
}

// --- Run everything ---------------------------------------------------
async function main() {
  try {
    await fetchEarthquakes();
    await fetchWeather();
    await fetchIss();
    console.log("All done, Pulse is up to date.");
  } catch (err) {
    console.error("Something went wrong:", err.message);
    process.exit(1);
  }
}

main();
