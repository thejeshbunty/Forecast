/* ================= GLOBAL CHART VARIABLES ================= */

let multiChart, rainChart, windChart, climateChart;

/* ============================================================
   NEW FEATURE BLOCK START (ADDED — NOTHING REMOVED)
============================================================ */

/* ===== Country Flag Support ===== */

function setLocationWithFlag(name, country) {
const code = localStorage.getItem("country_code")?.toLowerCase();
if (document.getElementById("locationName")) {
if (code) {
document.getElementById("locationName").innerHTML =
`<img src="https://flagcdn.com/24x18/${code}.png"
style="margin-right:8px;">
${name}, ${country}`;
} else {
document.getElementById("locationName").innerText = name + ", " + country;
}
}
}

/* ===== Recent Searches ===== */

function saveRecent(city){
let recent = JSON.parse(localStorage.getItem("recentCities")) || [];
recent = recent.filter(c => c.name !== city.name);
recent.unshift(city);
recent = recent.slice(0,5);
localStorage.setItem("recentCities",JSON.stringify(recent));
}


/* ===== Skeleton Loader ===== */

function showSkeleton(){
if(document.getElementById("temperature")){
document.getElementById("temperature").innerHTML =
"<div class='skeleton'></div>";
}
document.body.style.cursor="wait";
}

function hideSkeleton(){
document.body.style.cursor="default";
}

/* ===== Professional UX: Highlight Active Sidebar ===== */

document.addEventListener("DOMContentLoaded",()=>{
document.querySelectorAll(".sidebar a").forEach(link=>{
if(link.href === window.location.href){
link.style.background="rgba(0,242,255,0.2)";
link.style.color="#00f2ff";
}
});
});

/* ============================================================
   ORIGINAL AUTO SUGGEST (UNCHANGED)
============================================================ */

const input = document.getElementById("cityInput");
const suggestionsBox = document.getElementById("suggestions");

let selectedIndex = -1;
let debounceTimer;

if(input){

input.addEventListener("input", () => {

clearTimeout(debounceTimer);

debounceTimer = setTimeout(async () => {

const query = input.value.trim();
if(query.length < 2){
suggestionsBox.innerHTML = "";
return;
}

const res = await fetch(
`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5`
);

const data = await res.json();
suggestionsBox.innerHTML = "";

if(!data.results) return;

data.results.forEach((city, index) => {

const div = document.createElement("div");
div.classList.add("suggestion-item");

/* Added Flag Here */
div.innerHTML = `
<img src="https://flagcdn.com/24x18/${city.country_code.toLowerCase()}.png"
style="margin-right:8px;">
${city.name}, ${city.country}
`;

div.addEventListener("click", () => {
selectCity(city);
});

suggestionsBox.appendChild(div);
});

selectedIndex = -1;

}, 400);

});

/* Keyboard Navigation (UNCHANGED) */

input.addEventListener("keydown", (e) => {

const items = document.querySelectorAll(".suggestion-item");

if(e.key === "ArrowDown"){
selectedIndex++;
if(selectedIndex >= items.length) selectedIndex = 0;
updateActive(items);
}

if(e.key === "ArrowUp"){
selectedIndex--;
if(selectedIndex < 0) selectedIndex = items.length - 1;
updateActive(items);
}

if(e.key === "Enter"){
if(selectedIndex >= 0){
items[selectedIndex].click();
}
}

});

}

/* ===== Select City Function (ADDED RECENT + FLAG STORAGE) ===== */

function selectCity(city){

localStorage.setItem("lat",city.latitude);
localStorage.setItem("lon",city.longitude);
localStorage.setItem("name",city.name);
localStorage.setItem("country",city.country);
localStorage.setItem("country_code",city.country_code);

saveRecent(city); // NEW

suggestionsBox.innerHTML="";
input.value = city.name;

loadWeather(city.latitude,city.longitude,city.name,city.country);
}

/* ===== Highlight Active Suggestion (UNCHANGED) ===== */

function updateActive(items){
items.forEach(item => item.classList.remove("active"));
if(items[selectedIndex]){
items[selectedIndex].classList.add("active");
}
}

/* ===== Close Suggestions (UNCHANGED) ===== */

document.addEventListener("click",(e)=>{
if(!e.target.closest(".search-wrapper")){
if(suggestionsBox) suggestionsBox.innerHTML="";
}
});

/* ================= SEARCH CITY (ADDED FLAG + RECENT) ================= */

function searchCity(){
const city=document.getElementById("cityInput")?.value.trim();
if(!city){ alert("Enter city"); return; }

fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`)
.then(res=>res.json())
.then(data=>{
if(!data.results){ alert("City not found"); return; }

const result=data.results[0];

localStorage.setItem("lat",result.latitude);
localStorage.setItem("lon",result.longitude);
localStorage.setItem("name",result.name);
localStorage.setItem("country",result.country);
localStorage.setItem("country_code",result.country_code);

saveRecent(result); // NEW

loadWeather(result.latitude,result.longitude,result.name,result.country);
});
}

function getLocationWeather(){

if(!navigator.geolocation){
alert("Geolocation not supported");
return;
}

navigator.geolocation.getCurrentPosition(async (position)=>{

const lat = position.coords.latitude;
const lon = position.coords.longitude;

// Reverse geocode to get name
const geoRes = await fetch(
`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1`
);

const geoData = await geoRes.json();

let name = "Current Location";
let country = "";

if(geoData.results && geoData.results.length > 0){
name = geoData.results[0].name;
country = geoData.results[0].country;
}

localStorage.setItem("lat",lat);
localStorage.setItem("lon",lon);
localStorage.setItem("name",name);
localStorage.setItem("country",country);

loadWeather(lat,lon,name,country);

});

}

/* ===== Weather Alert Banner (FIXED) ===== */

function showWeatherAlert(data){

const alertDiv = document.getElementById("alertBanner");
if(!alertDiv) return;

alertDiv.style.display = "block";

if(data.current.wind_speed_10m > 40){
alertDiv.innerHTML="⚠ High Wind Warning!";
alertDiv.style.background="#ff4d4d";
}
else if(data.current.temperature_2m > 35){
alertDiv.innerHTML="🔥 Heat Alert!";
alertDiv.style.background="#ff9900";
}
else if(data.hourly.precipitation_probability[0] > 70){
alertDiv.innerHTML="🌧 Heavy Rain Alert!";
alertDiv.style.background="#0072ff";
}
else{
alertDiv.innerHTML="✅ Weather Conditions Normal";
alertDiv.style.background="rgba(0,242,255,0.2)";
}

}


/* ================= MAIN WEATHER FUNCTION ================= */

async function loadWeather(lat=28.61,lon=77.23,name="Delhi",country="India"){

showSkeleton(); // NEW

const res=await fetch(
`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}
&current=temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m
&hourly=temperature_2m,pressure_msl,relative_humidity_2m,wind_speed_10m,precipitation_probability
&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max
&timezone=auto`
);

const data=await res.json();

const labels = data.hourly.time.slice(0,24).map(t=>{
  const d = new Date(t);
  return d.getHours() + ":00";
});

/* Replaced title with flag function */
setLocationWithFlag(name,country); // NEW

showWeatherAlert(data); // NEW

hideSkeleton(); // NEW


/* ================= DASHBOARD ================= */

if(document.getElementById("temperature")){
document.getElementById("temperature").innerText=Math.round(data.current.temperature_2m)+"°C";
document.getElementById("feelsLike").innerText=Math.round(data.current.apparent_temperature)+"°C";
document.getElementById("humidity").innerText=data.current.relative_humidity_2m+"%";
document.getElementById("pressure").innerText=data.current.pressure_msl+" hPa";
document.getElementById("wind").innerText=data.current.wind_speed_10m+" km/h";

/* ===== 7 DAY FORECAST ===== */

const forecastContainer=document.getElementById("forecastContainer");
if(forecastContainer){
forecastContainer.innerHTML="";

function icon(code){
if(code===0) return "☀️";
if(code<=3) return "⛅";
if(code<=48) return "☁️";
if(code<=67) return "🌧";
if(code<=99) return "⛈";
return "🌡";
}

for(let i=0;i<data.daily.time.length;i++){
const day=new Date(data.daily.time[i]).toLocaleDateString("en-US",{weekday:"short"});
const max=Math.round(data.daily.temperature_2m_max[i]);
const min=Math.round(data.daily.temperature_2m_min[i]);
const rain=data.daily.precipitation_probability_max[i];
const wcode=data.daily.weathercode[i];

const card=document.createElement("div");
card.className="card";
card.innerHTML=`
<h4>${day} ${icon(wcode)}</h4>
<p><strong>${max}°</strong> / ${min}°</p>
<p>🌧 ${rain}%</p>
`;
forecastContainer.appendChild(card);
}
}
}



/* ============================================================
   24H TEMPERATURE + PRESSURE
============================================================ */

if(document.getElementById("multiChart")){

if(multiChart) multiChart.destroy();

const ctx=document.getElementById("multiChart").getContext("2d");

const gradientTemp=ctx.createLinearGradient(0,0,0,400);
gradientTemp.addColorStop(0,"rgba(0,242,255,0.6)");
gradientTemp.addColorStop(1,"rgba(0,242,255,0.05)");

multiChart=new Chart(ctx,{
type:"line",
data:{
labels:labels,
datasets:[
{
label:"Temperature (°C)",
data:data.hourly.temperature_2m.slice(0,24),
borderColor:"#00f2ff",
backgroundColor:gradientTemp,
fill:true,
tension:0.4,
yAxisID:"y1"
},
{
label:"Pressure (hPa)",
data:data.hourly.pressure_msl.slice(0,24),
borderColor:"#ffcc00",
tension:0.4,
yAxisID:"y2"
}
]
},
options:dualAxisOptions("Temperature (°C)","Pressure (hPa)")
});
}

/* ============================================================
   24H RAIN
============================================================ */

if(document.getElementById("rainChart")){

if(rainChart) rainChart.destroy();

const ctxRain=document.getElementById("rainChart").getContext("2d");

const rainGradient=ctxRain.createLinearGradient(0,0,0,400);
rainGradient.addColorStop(0,"rgba(0,198,255,0.9)");
rainGradient.addColorStop(1,"rgba(0,198,255,0.05)");

rainChart=new Chart(ctxRain,{
type:"bar",
data:{
labels:labels,
datasets:[
{
type:"bar",
label:"Rain Probability (%)",
data:data.hourly.precipitation_probability.slice(0,24),
backgroundColor:rainGradient,
borderRadius:6
},
{
type:"line",
label:"Rain Trend",
data:data.hourly.precipitation_probability.slice(0,24),
borderColor:"#00f2ff",
tension:0.4,
fill:true
}
]
},
options:singleAxisOptions("Rain Probability (%)",0,100)
});
}

/* ============================================================
   24H WIND
============================================================ */

if(document.getElementById("windChart")){

   if(windChart) windChart.destroy();

const ctxWind=document.getElementById("windChart").getContext("2d");

const windGradient=ctxWind.createLinearGradient(0,0,0,400);
windGradient.addColorStop(0,"rgba(0,255,200,0.7)");
windGradient.addColorStop(1,"rgba(0,255,200,0.05)");

windChart=new Chart(ctxWind,{
type:"line",
data:{
labels:labels,
datasets:[
{
label:"Wind Speed (km/h)",
data:data.hourly.wind_speed_10m.slice(0,24),
borderColor:"#00ffcc",
backgroundColor:windGradient,
fill:true,
tension:0.4
}
]
},
    options:singleAxisOptions("Wind Speed (km/h)")
    });
}




/* ============================================================
   24H CLIMATE OVERVIEW (UPGRADED PRO VERSION)
============================================================ */

if(document.getElementById("climateChart")){

if(climateChart) climateChart.destroy();

const ctxClimate=document.getElementById("climateChart").getContext("2d");

const tempGrad=ctxClimate.createLinearGradient(0,0,0,400);
tempGrad.addColorStop(0,"rgba(0,242,255,0.5)");
tempGrad.addColorStop(1,"rgba(0,242,255,0.05)");

climateChart=new Chart(ctxClimate,{
type:"line",
data:{
labels:labels,
datasets:[
{
label:"Temperature (°C)",
data:data.hourly.temperature_2m.slice(0,24),
borderColor:"#00f2ff",
backgroundColor:tempGrad,
fill:true,
tension:0.4,
yAxisID:"y1"
},
{
label:"Humidity (%)",
data:data.hourly.relative_humidity_2m.slice(0,24),
borderColor:"#ff4d4d",
tension:0.4,
yAxisID:"y1"
},
{
label:"Pressure (hPa)",
data:data.hourly.pressure_msl.slice(0,24),
borderColor:"#ffcc00",
tension:0.4,
yAxisID:"y2"
}
]
},
options:dualAxisOptions("Temp & Humidity","Pressure")
});
}
}


/* ================= CSV EXPORT (GLOBAL FIX) ================= */

async function exportForecastCSV() {

  const lat = localStorage.getItem("lat");
  const lon = localStorage.getItem("lon");
  const name = localStorage.getItem("name");

  if (!lat || !lon) {
    alert("No location data available");
    return;
  }

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
  );

  const data = await res.json();

  let csv = "Date,Max Temp,Min Temp,Rain %\n";

  for (let i = 0; i < data.daily.time.length; i++) {
    csv += `${data.daily.time[i]},${data.daily.temperature_2m_max[i]},${data.daily.temperature_2m_min[i]},${data.daily.precipitation_probability_max[i]}\n`;
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "7day_forecast.csv";
  a.click();

  URL.revokeObjectURL(url);
}

/*Chart as Image*/

function downloadChart(chartId, fileName) {

  const canvas = document.getElementById(chartId);

  if (!canvas) {
    alert("Chart not found!");
    return;
  }

  setTimeout(() => {
    const url = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName + ".png";
    a.click();
  }, 500);
}

/*  Export PDF Report */
/* ================= FULL PDF REPORT ================= */

async function exportFullReport() {

  const { jsPDF } = window.jspdf;

  if (!window.jspdf) {
    alert("PDF library not loaded!");
    return;
  }

  const doc = new jsPDF();

  const name = localStorage.getItem("name") || "N/A";
  const country = localStorage.getItem("country") || "";

  const lat = localStorage.getItem("lat");
  const lon = localStorage.getItem("lon");

  if (!lat || !lon) {
    alert("No location data available");
    return;
  }

  // 🔥 Fetch live data
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m`
  );

  const data = await res.json();

  // ===== TEXT =====
  doc.setFontSize(16);
  doc.text("Weather Full Report", 20, 20);

  doc.setFontSize(12);
  doc.text(`Location: ${name}, ${country}`, 20, 30);
  doc.text(`Temperature: ${data.current.temperature_2m} °C`, 20, 40);
  doc.text(`Humidity: ${data.current.relative_humidity_2m} %`, 20, 50);
  doc.text(`Pressure: ${data.current.pressure_msl} hPa`, 20, 60);
  doc.text(`Wind: ${data.current.wind_speed_10m} km/h`, 20, 70);

  // ===== CHART IMAGE =====
  const canvas = document.getElementById("multiChart");

  if (canvas) {
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", 15, 90, 180, 80);
  }

  doc.save("full_weather_report.pdf");
}

/* ================= OPTIONS FUNCTIONS ================= */

function singleAxisOptions(title,min=null,max=null){
return{
responsive:true,
interaction:{mode:"index",intersect:false},
plugins:{legend:{labels:{color:"#fff"}}},
scales:{
x:{ticks:{color:"#ccc"}},
y:{
beginAtZero:(min===0),
min:min,
max:max,
title:{display:true,text:title,color:"#00f2ff"},
ticks:{color:"#00f2ff"}
}
}
};
}

function dualAxisOptions(title1,title2){
return{
responsive:true,
interaction:{mode:"index",intersect:false},
plugins:{legend:{labels:{color:"#fff"}}},
scales:{
x:{ticks:{color:"#ccc"}},
y1:{
type:"linear",
position:"left",
title:{display:true,text:title1,color:"#00f2ff"},
ticks:{color:"#00f2ff"}
},
y2:{
type:"linear",
position:"right",
title:{display:true,text:title2,color:"#ffcc00"},
ticks:{color:"#ffcc00"},
grid:{drawOnChartArea:false}
}
}
};
}

/* ================= LOAD WEATHER ON PAGE LOAD ================= */

window.addEventListener("DOMContentLoaded", () => {

    let lat = localStorage.getItem("lat");
    let lon = localStorage.getItem("lon");
    let name = localStorage.getItem("name");
    let country = localStorage.getItem("country");

    if (lat) loadWeather(lat, lon, name, country);
    else loadWeather();

});


/* ================= SATELLITE MAP SYSTEM ================= */

/* ============================================================
   ADVANCED LIVE WEATHER SATELLITE SYSTEM
   Works only on satellite.html
============================================================ */

if (document.getElementById("map")) {

    let lat = parseFloat(localStorage.getItem("lat")) || 13.0827;
    let lon = parseFloat(localStorage.getItem("lon")) || 80.2707;

    const map = L.map("map", {
        zoomControl: true
    }).setView([lat, lon], 6);

    /* ================= BASE SATELLITE ================= */

    const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles © Esri" }
    ).addTo(map);

    /* ================= PLACE NAME LABELS ================= */

    const labelLayer = L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Labels © Esri" }
    );

    /* ================= WEATHER LAYERS ================= */

    const cloudLayer = L.tileLayer(
        "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=f6d50d34ddb1825784f455cc75d9c628",
        { opacity: 0.5, maxZoom: 19 }
    );

    const rainLayer = L.tileLayer(
        "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=f6d50d34ddb1825784f455cc75d9c628",
        { opacity: 0.6, maxZoom: 19 }
    );

    const tempLayer = L.tileLayer(
        "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=f6d50d34ddb1825784f455cc75d9c628",
        { opacity: 0.6, maxZoom: 19 }
    );

    const windLayer = L.tileLayer(
        "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=f6d50d34ddb1825784f455cc75d9c628",
        { opacity: 0.7, maxZoom: 19 }
    );

    /* ================= IMD WMS ================= */

    const imdLayer = L.tileLayer.wms(
        "https://mausam.imd.gov.in/wms?",
        {
            layers: "imd:rainfall",
            format: "image/png",
            transparent: true,
            opacity: 0.6
        }
    );

    /* ================= LAYER CONTROL ================= */

    L.control.layers(
        { "🛰 Satellite": satelliteLayer },
        {
            "🏷 Place Names": labelLayer,
            "☁ Cloud Cover": cloudLayer,
            "🌧 Rain Radar": rainLayer,
            "🌡 Temperature": tempLayer,
            "🌀 Wind": windLayer,
            "🇮🇳 IMD Rainfall": imdLayer
        },
        { collapsed: false }
    ).addTo(map);

    /* ================= MOVING MARKER ================= */

    let selectedMarker = null;

    /* ================= CLICK → UPDATE DASHBOARD ================= */

    map.on("click", async function (e) {

        const clickedLat = e.latlng.lat;
        const clickedLon = e.latlng.lng;

        // Remove old marker
        if (selectedMarker) {
            map.removeLayer(selectedMarker);
        }

        selectedMarker = L.marker([clickedLat, clickedLon]).addTo(map);

        // Smooth zoom
        map.flyTo([clickedLat, clickedLon], 9);

        try {
            const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${clickedLat}&longitude=${clickedLon}&count=1`
            );
            const geoData = await geoRes.json();

            let cityName = "Selected Location";
            let countryName = "";

            if (geoData.results && geoData.results.length > 0) {
                cityName = geoData.results[0].name;
                countryName = geoData.results[0].country;
            }

            localStorage.setItem("lat", clickedLat);
            localStorage.setItem("lon", clickedLon);
            localStorage.setItem("name", cityName);
            localStorage.setItem("country", countryName);

            // Update dashboard
            if (typeof loadWeather === "function") {
                loadWeather(clickedLat, clickedLon, cityName, countryName);
            }

            L.popup()
                .setLatLng(e.latlng)
                .setContent(`
                    <b>📍 ${cityName}</b><br>
                    Lat: ${clickedLat.toFixed(4)}<br>
                    Lon: ${clickedLon.toFixed(4)}<br><br>
                    Dashboard Updated ✔
                `)
                .openOn(map);

        } catch (err) {
            console.error("Reverse geocoding error:", err);
        }
    });

    /* ================= RADAR ANIMATION ================= */

    let radarOpacity = 0.6;
    setInterval(() => {
        if (map.hasLayer(rainLayer)) {
            radarOpacity = radarOpacity === 0.6 ? 0.8 : 0.6;
            rainLayer.setOpacity(radarOpacity);
        }
    }, 1500);

    /* ================= CLOUD ANIMATION ================= */

    setInterval(() => {
        if (map.hasLayer(cloudLayer)) {
            const current = cloudLayer.options.opacity;
            cloudLayer.setOpacity(current === 0.5 ? 0.7 : 0.5);
        }
    }, 2000);


    /* ================= FULLSCREEN BUTTON ================= */

    const fullscreenControl = L.control({ position: "topleft" });

    fullscreenControl.onAdd = function () {
        const btn = L.DomUtil.create("button");
        btn.innerHTML = "⛶";
        btn.style.background = "white";
        btn.style.padding = "6px";
        btn.style.cursor = "pointer";
        btn.onclick = () => map.getContainer().requestFullscreen();
        return btn;
    };

    fullscreenControl.addTo(map);

    /* ================= FIX HALF MAP ISSUE ================= */

    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}