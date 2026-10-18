import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = initializeApp({
  databaseURL: "https://esp32sensorsdata-4a025-default-rtdb.firebaseio.com",
});
const db = getDatabase(app);

const $ = (id) => document.getElementById(id);
const OFFLINE_AFTER_MS = 15000; // no new data for 15s = device offline
const startedAt = Date.now();
let lastUpdate = 0;
let initialSnapshotReceived = false;

const alarmMessages = {
  WATER: "ALARM: Water detected",
  HIGH_TEMP: "ALARM: High temperature",
  DARK: "ALARM: Dark (low light)",
  OBJECT_CLOSE: "ALARM: Object too close",
  NONE: "All clear: no alarms",
};

function fmt(v, digits = 1) {
  return v === null || v === undefined ? "--" : Number(v).toFixed(digits);
}

function temperatureIcon(value) {
  const temperature = Number(value);
  if (value === null || value === undefined || !Number.isFinite(temperature)) {
    return "images/icons/temperature.png";
  }
  if (temperature < 18) return "images/icons/tempverycool.png";
  if (temperature < 24) return "images/icons/tempcool.png";
  if (temperature < 30) return "images/icons/tempcomfotable.png";
  if (temperature < 35) return "images/icons/tempwarm.png";
  if (temperature <= 40) return "images/icons/temphot.png";
  return "images/icons/tempveryhot.png";
}

function humidityIcon(value) {
  const humidity = Number(value);
  if (value === null || value === undefined || !Number.isFinite(humidity)) {
    return "images/icons/humidity.png";
  }
  if (humidity < 15) return "images/icons/humidity.png";
  if (humidity <= 40) return "images/icons/humid30.png";
  if (humidity <= 70) return "images/icons/humid60.png";
  return "images/icons/humid80.png";
}

function clearSensorReadings() {
  ["temp", "hum", "dist", "water", "light"].forEach((id) => {
    $(id).textContent = "--";
  });
  $("distUnit").textContent = "";
  $("distanceIcon").src = "images/icons/distancefar.png";
  ["cardTemp", "cardDist", "cardWater", "cardLight"].forEach((id) => {
    $(id).classList.remove("alert");
  });
  $("temperatureIcon").src = "images/icons/temperature.png";
  $("humidityIcon").src = "images/icons/humidity.png";
  $("waterIcon").src = "images/icons/water.png";
  $("lightIcon").src = "images/icons/light.png";
  $("alarmText").textContent = "No sensor data";
  $("alarmBox").className = "alarm clear";
  $("footer").textContent = "Last update: --";
}

onValue(ref(db, "sensors"), (snapshot) => {
  const d = snapshot.val();
  if (!initialSnapshotReceived) {
    initialSnapshotReceived = true;
    return;
  }
  if (!d) return;
  lastUpdate = Date.now();

  // Numbers
  $("temp").textContent = fmt(d.temperature);
  $("hum").textContent = fmt(d.humidity);
  $("temperatureIcon").src = temperatureIcon(d.temperature);
  $("humidityIcon").src = humidityIcon(d.humidity);

  if (d.distance === null || d.distance === undefined) {
    $("dist").textContent = "No reading";
    $("distUnit").textContent = "";
    $("distanceIcon").src = "images/icons/distancefar.png";
  } else {
    $("dist").textContent = fmt(d.distance);
    $("distUnit").textContent = "cm";
    $("distanceIcon").src = Number(d.distance) < 10
      ? "images/icons/distanceclose.png"
      : "images/icons/distancefar.png";
  }

  // Water
  $("water").textContent = d.water ? "WATER DETECTED" : "Dry";
  $("cardWater").classList.toggle("alert", !!d.water);
  $("waterIcon").src = d.water
    ? "images/icons/wateron.png"
    : "images/icons/water.png";

  // Light
  $("light").textContent = d.dark ? "Dark" : "Bright";
  $("lightIcon").src = d.dark
    ? "images/icons/light.png"
    : "images/icons/lighton.png";

  // Card highlights
  $("cardTemp").classList.toggle("alert", d.alarm === "HIGH_TEMP");
  $("cardDist").classList.toggle("alert", d.alarm === "OBJECT_CLOSE");
  $("cardLight").classList.toggle("alert", d.alarm === "DARK");

  // Alarm banner
  const alarm = d.alarm || "NONE";
  $("alarmText").textContent = alarmMessages[alarm] || alarm;
  $("alarmBox").className = "alarm " + (alarm === "NONE" ? "clear" : "active");

  $("footer").textContent = "Last update: " + new Date().toLocaleTimeString();
});

// Online/offline indicator
setInterval(() => {
  const dot = $("dot");
  const text = $("statusText");

  if (!lastUpdate) {
    clearSensorReadings();
    dot.className = "dot";
    if (initialSnapshotReceived && Date.now() - startedAt > OFFLINE_AFTER_MS) {
      dot.className = "dot offline";
      text.textContent = "Device offline";
    } else {
      text.textContent = "Waiting for device...";
    }
    return;
  }

  if (Date.now() - lastUpdate > OFFLINE_AFTER_MS) {
    clearSensorReadings();
    dot.className = "dot offline";
    text.textContent = "Device offline";
  } else {
    dot.className = "dot online";
    text.textContent = "Live";
  }
}, 1000);
