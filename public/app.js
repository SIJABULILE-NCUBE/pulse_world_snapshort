// app.js
// This is the frontend, it only ever reads from Supabase, it never writes.
// That's why it's safe to use the anon key here, and why row level
// security on the tables only allows select, not insert or update.

// Fill these in with your own project's values, found in Supabase under
// Project Settings, API. The anon key is public by design, it's meant
// to be visible in frontend code.
const SUPABASE_URL = "https://npefjsgkkiiixowifqzt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RHwUcDVkWlFPkwLbYgb24g_ptvNnBRa";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- little clock in the top corner, just for atmosphere -------------
function tickClock() {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString();
}
tickClock();
setInterval(tickClock, 1000);

// --- Earthquakes -------------------------------------------------------

let allQuakes = []; // I keep the full list here so filtering/sorting
                     // doesn't need to hit the database again each time

async function loadQuakes() {
  const { data, error } = await sb
    .from("earthquakes")
    .select("*")
    .order("quake_time", { ascending: false });

  if (error) {
    console.error(error);
    document.getElementById("quake-list").innerHTML =
      '<p class="loading">could not load earthquakes</p>';
    return;
  }

  allQuakes = data;
  renderQuakes();
  drawPulseLine(data);
}

function renderQuakes() {
  const minMag = parseFloat(document.getElementById("mag-filter").value);
  const sortOrder = document.getElementById("sort-order").value;

  let list = allQuakes.filter((q) => q.magnitude >= minMag);

  if (sortOrder === "strongest") {
    list = list.sort((a, b) => b.magnitude - a.magnitude);
  } else {
    list = list.sort((a, b) => new Date(b.quake_time) - new Date(a.quake_time));
  }

  const container = document.getElementById("quake-list");

  if (list.length === 0) {
    container.innerHTML = '<p class="loading">nothing matches that filter</p>';
    return;
  }

  container.innerHTML = list
    .map((q) => {
      const isStrong = q.magnitude >= 5;
      const timeAgo = new Date(q.quake_time).toLocaleString();
      return `
        <div class="quake-card ${isStrong ? "strong" : ""}">
          <div class="quake-mag">${q.magnitude?.toFixed(1) ?? "?"}</div>
          <div class="quake-info">
            <div class="quake-place">${q.place}</div>
            <div class="quake-meta">${timeAgo}, depth ${q.depth_km?.toFixed(0)}km</div>
          </div>
        </div>
      `;
    })
    .join("");
}

// whenever the filter or sort dropdown changes, just re-render from the
// list we already have, no need to go back to the database
document.getElementById("mag-filter").addEventListener("change", renderQuakes);
document.getElementById("sort-order").addEventListener("change", renderQuakes);

// --- the pulse line, drawn from real magnitudes -----------------------

function drawPulseLine(quakes) {
  // take the most recent 40 quakes, oldest to newest, left to right
  const recent = [...quakes]
    .sort((a, b) => new Date(a.quake_time) - new Date(b.quake_time))
    .slice(-40);

  if (recent.length === 0) return;

  const maxMag = Math.max(...recent.map((q) => q.magnitude || 0), 1);
  const stepX = 1000 / (recent.length - 1 || 1);

  const points = recent
    .map((q, i) => {
      const x = i * stepX;
      // taller spike for a bigger magnitude, centred on the middle of
      // the strip so it actually looks like a seismograph reading
      const spike = ((q.magnitude || 0) / maxMag) * 40;
      const y = 50 - spike;
      return `${x},${y}`;
    })
    .join(" ");

  const svg = document.getElementById("pulse-line");
  svg.innerHTML = `<polyline points="${points}" />`;
}

// --- Weather -------------------------------------------------------

async function loadWeather() {
  const { data, error } = await sb.from("weather_current").select("*");

  if (error) {
    console.error(error);
    document.getElementById("weather-list").innerHTML =
      '<p class="loading">could not load weather</p>';
    return;
  }

  const container = document.getElementById("weather-list");
  container.innerHTML = data
    .map(
      (w) => `
        <div class="weather-card">
          <div class="weather-city">${w.city}</div>
          <div class="weather-temp">${w.temperature_c?.toFixed(0)}&deg;C</div>
          <div class="weather-wind">wind ${w.windspeed_kmh?.toFixed(0)} km/h</div>
        </div>
      `
    )
    .join("");
}

// --- ISS position -------------------------------------------------------

async function loadIss() {
  const { data, error } = await sb
    .from("iss_position")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("iss-lat").textContent = data.latitude.toFixed(2);
  document.getElementById("iss-lon").textContent = data.longitude.toFixed(2);
  document.getElementById("iss-time").textContent = new Date(
    data.observed_at
  ).toLocaleTimeString();

  // plot the dot on the little grid, longitude runs -180 to 180 across
  // the width, latitude runs 90 to -90 down the height
  const xPercent = ((data.longitude + 180) / 360) * 100;
  const yPercent = ((90 - data.latitude) / 180) * 100;

  const dot = document.getElementById("iss-dot");
  dot.style.left = `${xPercent}%`;
  dot.style.top = `${yPercent}%`;
}

// --- kick everything off, then keep it fresh -------------------------

loadQuakes();
loadWeather();
loadIss();

// the ISS moves fast, so it's worth refreshing more often than the rest
setInterval(loadIss, 15000);
setInterval(loadWeather, 60000);
setInterval(loadQuakes, 60000);
