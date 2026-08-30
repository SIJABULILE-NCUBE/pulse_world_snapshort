Pulse, A Live World Snapshot Board

A lightweight real-time world dashboard that collects live public data from multiple APIs, stores it in Supabase, and presents it through a simple browser-based interface.

🔗 Project Links
Loom Presentation: [PASTE LOOM LINK HERE]
GitHub Repository: [PASTE GITHUB REPOSITORY LINK HERE]
Live Netlify App: [PASTE NETLIFY LINK HERE]
📌 Project Overview

Pulse is a small full-stack data dashboard designed to provide a quick snapshot of what is happening in the world right now.

The application connects to three free public APIs:

USGS Earthquake API for recent earthquake activity
Open-Meteo API for current weather information
Open Notify API for the current position of the International Space Station (ISS)

The data is collected by a Node.js script, stored in Supabase, and then displayed through a lightweight frontend.

The project intentionally keeps the user experience simple:

No login is required
No user account is required
No complex frontend framework is required
The browser reads public-facing data from Supabase
The backend collection script handles API requests and database updates
The same data can be viewed locally or through the deployed Netlify application

The main idea behind Pulse is to demonstrate how several independent external APIs can be brought together into one application, persisted in a database, and presented through a simple web interface.

🎯 Project Goals

The main goals of the project were to demonstrate the following skills:

Working with external REST APIs
Fetching and processing JSON data
Building a Node.js data collection script
Connecting a Node.js application to Supabase
Designing database tables around real-world data
Using primary keys to prevent duplicate records
Using upserts to keep data current
Separating server-side secrets from browser-side credentials
Building a simple static frontend
Reading data from Supabase in the browser
Deploying a frontend to Netlify
Understanding the difference between a development server and a backend process
🏗️ Application Architecture

The project follows a simple data pipeline:

                ┌─────────────────────┐
                │   USGS Earthquake   │
                │        API          │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │   Open-Meteo API    │
                │      Weather        │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │   Open Notify API   │
                │        ISS          │
                └──────────┬──────────┘
                           │
                    ┌──────▼──────┐
                    │   Node.js   │
                    │  fetch.js   │
                    └──────┬──────┘
                           │ Upsert
                           ▼
                    ┌─────────────┐
                    │  Supabase   │
                    │  PostgreSQL │
                    └──────┬──────┘
                           │ Read
                           ▼
                    ┌─────────────┐
                    │  Frontend   │
                    │ HTML/CSS/JS │
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
                    │   Browser   │
                    └─────────────┘

The important distinction is that the application has two different responsibilities:

Data collection. fetch.js communicates with the external APIs and writes the results into Supabase.
Data presentation. The files inside public/ communicate with Supabase and display the stored data to the user.

This separation keeps the browser code simple and prevents the Supabase secret key from being exposed to the frontend.

🌍 Data Sources
1. Earthquake Data

Source: USGS Earthquake API

The USGS API provides information about recent earthquake activity around the world. Pulse uses information such as:

Earthquake ID
Magnitude
Location
Latitude
Longitude
Depth
Time

The USGS earthquake ID is particularly useful because it provides a permanent identifier for each earthquake event. This makes it suitable for use as the primary key in the earthquakes table.

2. Weather Data

Source: Open-Meteo

Open-Meteo provides weather information without requiring an API key. Pulse uses the API to retrieve current weather information for five tracked cities: Johannesburg, London, New York, Tokyo, and Sydney.

The weather data includes:

City
Latitude
Longitude
Temperature
Windspeed
Weathercode

Unlike earthquakes, weather does not represent individual permanent events. The application is only interested in the current weather state for a location. For this reason, the city is used to identify the row in the weather_current table.

When the same location is fetched again, the existing record gets updated rather than creating another row.

3. International Space Station Data

Source: Open Notify

Open Notify provides the current position of the International Space Station. The ISS is a unique object in this application. There is only one ISS position that the dashboard needs to display at any given time.

For this reason, the iss_position table is deliberately designed to contain only one record. The row uses a fixed ID of 1, and every new fetch updates that row with the latest latitude, longitude, and timestamp.

This means the database always represents the current position rather than storing an unnecessary historical list of ISS positions.

📁 Project Structure
pulse/
│
├── node_modules/
│
├── public/
│   ├── app.js
│   ├── index.html
│   └── style.css
│
├── .env
├── .env.example
├── .gitignore
├── fetch.js
├── package.json
├── package-lock.json
├── README.md
└── schema.sql
public/index.html

This is the main HTML document for the dashboard. It provides the structure of the webpage and the elements that the JavaScript uses to display earthquakes, weather, and ISS information.

public/style.css

This file controls the visual presentation of the dashboard. It handles layout, spacing, typography, cards, colours, and responsive presentation. The theme uses a dark background with gold as the signature colour.

public/app.js

This is the browser-side JavaScript. Its main responsibility is to:

Connect to Supabase using the public anon key
Read the stored data from the three tables
Render the data into the HTML
Auto refresh the ISS position every 15 seconds
Auto refresh earthquakes and weather every 60 seconds
Handle the filter and sort controls on the earthquake panel

The Supabase anon key is used here because this code executes in the browser. The secret key is never placed in this file.

fetch.js

This is the data collection script. It runs with Node.js and communicates with the three external APIs.

The general flow is:

External API → fetch.js → Process JSON → Supabase → Upsert record

The script can be run manually whenever fresh data is required:

node fetch.js
schema.sql

This file contains the database structure for the project. It creates the three main tables:

earthquakes
weather_current
iss_position

It also enables Row Level Security and adds read-only policies so the frontend can safely read data using the public anon key.

The SQL can be copied into the Supabase SQL Editor and executed to create the required database structure.

.env

The .env file contains private server-side configuration. It should contain:

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_secret_key

The .env file should never be committed to GitHub. It is included in .gitignore to help prevent accidental exposure of credentials.

.env.example

This is a safe template showing which environment variables are required:

SUPABASE_URL=
SUPABASE_SERVICE_KEY=

The actual secret values should only exist in the local .env file.

🗄️ Database Design

Pulse uses Supabase as the database layer. Supabase provides a PostgreSQL database, which persists the information retrieved from the external APIs.

The database contains three tables.

🌋 earthquakes

The earthquake table stores earthquake events received from the USGS API. The important design decision is the use of the USGS earthquake ID as the primary key.

Conceptually:

earthquake ID → Primary Key → Unique earthquake event

This is useful because the same earthquake may appear again when the API is queried. Instead of inserting a duplicate row every time, the application performs an upsert.

For example:

First fetch:  Earthquake ABC123 → INSERT
Second fetch: Earthquake ABC123 → UPDATE

This keeps the database clean.

🌦️ weather_current

The weather table is designed differently. Weather information represents the current state of a location rather than a permanent event. The application does not need hundreds of rows containing old weather readings if the goal is simply to show the current picture.

The city is therefore used to identify the current weather record.

Conceptually:

Johannesburg → One current weather row → New fetch → Existing row updated

This means the table stays small and focused on the current state.

🛰️ iss_position

The ISS table is designed to hold the current ISS position. Because there is only one ISS being tracked, the application uses a fixed ID.

Conceptually:

ID = 1
Latitude  → updated
Longitude → updated
Timestamp → updated

The next API request does not create another ISS row. Instead, it updates the existing record.

🔑 Why I Used Different Primary Keys

I intentionally did not force all three tables to use the same database design. Each source represents something different.

Data	Real-world identity	Database strategy
Earthquake	Individual earthquake event	USGS earthquake ID
Weather	Current state of a location	City
ISS	One tracked ISS position	Fixed ID of 1

The key principle is:

The database key should represent what makes the record unique in the real world.

This is why upserts work particularly well for this project. The database can determine whether it needs to create a new record or update an existing record based on that real-world identity.

🔄 Why Upsert Is Important

An upsert combines two ideas:

INSERT if the row does not exist
UPDATE if it already exists

This matters for Pulse because the application repeatedly retrieves live data. Without upserts, running node fetch.js a few times would create duplicate records everywhere.

With upserts:

Existing earthquake       → Update
New earthquake            → Insert
Existing weather location → Update
ISS position              → Update

This allows the database to stay consistent while still receiving fresh information.

🎛️ Filter and Sort

The brief required at least one filter or sort. I built both, and both operate on the earthquake panel.

Filter by minimum magnitude:

All magnitudes
2.5 and up
4.0 and up
6.0 and up

Sort:

Strongest first
Newest first

I kept the full earthquake list in memory after the first fetch from Supabase, so filtering and sorting happens instantly in the browser without another database call.

🔁 Auto Refresh

The dashboard is not a static snapshot. Once the page loads, it keeps itself up to date:

ISS position refreshes every 15 seconds (it moves fast, so this is worth doing often)
Earthquakes refresh every 60 seconds
Weather refreshes every 60 seconds

To bring in genuinely new data from the source APIs, node fetch.js still needs to be run. The auto refresh only re-reads whatever is currently in Supabase, so it stays in sync with the database without a manual page reload.

🔐 Security and Environment Variables

The project uses two different Supabase credentials for different purposes.

Secret Key (also called service role key)

The secret key is used by the Node.js data collection script. It has elevated privileges and therefore must remain private.

It belongs in .env. It should never be placed inside public/app.js and it should never be committed to GitHub.

Publishable Key (also called anon key)

The publishable key is used by the browser-side application. It can safely be included in public/app.js.

Exposing the publishable key does not mean database security is ignored. Row Level Security is enabled on all three tables, and the policies only allow read access using this key. Writes are only possible with the secret key, which stays on the server side.

The important security principle is:

Secret key       → Backend only
Publishable key  → Browser (safe with RLS)
⚙️ Installation and Setup
Step 1: Clone the Repository
git clone [PASTE GITHUB REPOSITORY LINK HERE]
cd pulse
Step 2: Install Dependencies
npm install

This installs the Node.js packages required by the project. After installation, the project will have a node_modules folder.

Step 3: Create the Supabase Project

Create a Supabase project at supabase.com. Inside Supabase:

Open the project
Go to the SQL Editor
Open schema.sql from this repo
Copy the SQL
Paste it into the SQL Editor
Run the SQL

This creates the tables required by Pulse and sets up the read-only Row Level Security policies.

Step 4: Configure the Environment Variables

Create a .env file based on .env.example.

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_secret_key

Do not use the publishable key as the secret key. The secret key is only required by the server-side fetch.js script and can be found in Supabase under Project Settings, API Keys, Secret Keys.

Step 5: Configure the Frontend

Open public/app.js and add the Supabase project URL and the Supabase publishable key.

The frontend uses the publishable key because the JavaScript runs inside the user's browser. Do not place the secret key in this file.

Step 6: Fetch the Data
node fetch.js

This contacts the three external APIs and stores the returned data in Supabase. If everything is configured correctly, the Supabase tables should begin containing data.

🌐 Why I Used Live Server Instead of npm run dev

One important design decision in this project is that I used the VS Code Live Server extension to run the frontend rather than using npm run dev.

The reason is that Pulse is not a Vite application or another frontend framework project that requires a development server. The frontend consists of plain HTML, CSS, and JavaScript. The main entry point is public/index.html. There is no React, no Vite configuration, and no bundler required for these files.

What Live Server Does

The Live Server extension provides a lightweight local HTTP server. Instead of opening the HTML file directly with file:///, Live Server serves it through http://127.0.0.1:5500/ or a similar localhost address.

This matters because browser applications that communicate with external services (like Supabase) behave differently when opened directly as local files. Live Server gives the frontend a normal HTTP environment while also providing automatic browser refresh when files change.

Why Not npm run dev?

npm run dev only works if the project has a dev script defined in package.json. For example, a Vite project might contain:

json
"scripts": {
  "dev": "vite"
}

Pulse does not need that setup. The Node.js portion of Pulse is not a continuously running development web server. The node fetch.js script is a data collection process. Its job is to:

Call APIs → Process data → Write data to Supabase → Finish

The frontend is a separate static application. Therefore:

Live Server runs the static frontend locally
node fetch.js collects and stores API data

These are two different responsibilities.

In Short

I used Live Server because the frontend is plain HTML, CSS, and JavaScript, and does not require a framework development server. node fetch.js is used separately to collect and store the live API data.

This is an intentional architectural choice rather than a limitation.

🧪 Running the Application Locally

A typical local workflow is:

Terminal: Run the data collection script:

node fetch.js

VS Code: Right click public/index.html and select Open with Live Server.

The browser will open the dashboard, and the frontend will read the data stored in Supabase.

🚀 Deployment
Frontend Deployment

The frontend is deployed to Netlify because the public/ folder contains static web assets: index.html, style.css, and app.js. These files can be served by any static hosting platform.

Live application: [PASTE NETLIFY LINK HERE]

The deployed application reads the public-facing data from Supabase using the publishable key and the Row Level Security read policies.

Backend Note

The fetch.js script is not deployed as part of the site because it is not a website, it is a script that talks to Supabase from my machine. A future improvement would be to set this up to run on a schedule using something like a GitHub Action or a Supabase Edge Function, so the data would stay fresh without me needing to manually run node fetch.js.

🐙 GitHub

The GitHub repository contains the source code for the project.

Repository: [PASTE GITHUB REPOSITORY LINK HERE]

The repository does not contain the .env file or private credentials. The .gitignore file prevents sensitive and local files such as .env and node_modules from being committed.

🎥 Loom Presentation

Loom video: [PASTE LOOM LINK HERE]

💡 Lessons Learned

One of the main lessons from this project was that different API sources often need different database strategies. It is tempting to design all tables the same way, but the better approach is to understand the data first.

An earthquake is an individual event. Weather is a current state. The ISS represents one continuously changing object. Therefore, each table has a different identity strategy.

Another important lesson was understanding the difference between backend data processing and frontend data presentation. The backend script can safely use privileged credentials, while the browser should only ever use the public-facing publishable key with Row Level Security in place.

🚧 Current Limitations
Data collection is manual (run node fetch.js)
No automated scheduling of the fetch script yet
No user authentication (by design)
No historical trend analysis, the focus is on the current snapshot
🔮 Future Improvements
Automatic data refresh using a GitHub Action or Supabase Edge Function to schedule fetch.js
Interactive map showing earthquake markers, ISS location, and tracked weather cities
Weather search so users can enter any city and get its current weather
Stretch goal: join earthquakes and weather by geography, for example "Magnitude 4.7 earthquake near Chile. Nearest tracked weather location: Sydney, 21°C." Both tables already have latitude and longitude, so the foundation is in place.
🏁 Final Project Summary

Pulse is a small but complete data integration project. It demonstrates the full journey of external data from API to user:

PUBLIC APIs → NODE.JS → SUPABASE → CLIENT-SIDE JS → BROWSER → NETLIFY

The project demonstrates practical understanding of API integration, database design, data persistence, upserts, environment variables, frontend development, local development servers, and deployment. The architecture is intentionally simple but it provides a strong foundation for the future improvements listed above.

📎 Project Resources
Resource	Link
🎥 Loom Presentation	[PASTE LOOM LINK HERE]
🐙 GitHub Repository	[PASTE GITHUB REPOSITORY LINK HERE]
🌐 Live Netlify Application	[PASTE NETLIFY LINK HERE]