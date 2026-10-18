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

function clearSensorReadings() {
  ["temp", "hum", "dist", "water", "light"].forEach((id) => {
    $(id).textContent = "--";
  });
  $("distUnit").textContent = "";
  ["cardTemp", "cardDist", "cardWater", "cardLight"].forEach((id) => {
    $(id).classList.remove("alert");
  });
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

  if (d.distance === null || d.distance === undefined) {
    $("dist").textContent = "No reading";
    $("distUnit").textContent = "";
  } else {
    $("dist").textContent = fmt(d.distance);
    $("distUnit").textContent = "cm";
  }

  // Water
  $("water").textContent = d.water ? "WATER DETECTED" : "Dry";
  $("cardWater").classList.toggle("alert", !!d.water);

  // Light
  $("light").textContent = d.dark ? "Dark" : "Bright";

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
