console.log("app.js loaded");

// ===============================
// CONFIG
// ===============================
const LOGIC_APP_URL = "PASTE_YOUR_LOGIC_APP_URL_HERE";
const TEST_MODE = false; // set true ONLY when testing without video

// ===============================
// JOB SITES
// ===============================
const JOB_SITES = [
  "25-129 PHC Cardiac Rehab",
  "25-103 Ajax Memphis",
  "25-120 Blue Cloud Pittsburg",
  "24-116 BS-MOB 2 / Addition",
  "25-131 Eagle Point Expansion",
  "25-116 Harcros Chemical",
  "25-127 Alton Memorial SLCH Therapy",
  "25-126 Blue Cloud Toledo",
  "25-114 Mapletree Corp",
  "364 Logistics Center",
  "25-132 Blue Cloud Charlotte",
  "25-134 Blue Cloud Reno",
  "25-105 MBMC Switchgear",
  "25-111 PHC Power Plant",
  "23-159 BJH CPAP Renovation/ Change Order",
  "25-130 Kuna Freezer Expansion",
  "25-121 ABC Supply",
  "RMMC CO",
  "Fondren Surgical Suites"
];

// ===============================
// GLOBAL STATE
// ===============================
let videoCompleted = false;
let isDrawing = false;
let canvas, ctx;

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  populateJobSites();
  setupVideoTracking();
  setupSignaturePad();
  setupFormSubmit();
});

// ===============================
// JOB SITE DROPDOWN
// ===============================
function populateJobSites() {
  const select = document.getElementById("jobSite");

  JOB_SITES.forEach(site => {
    const opt = document.createElement("option");
    opt.value = site;
    opt.textContent = site;
    select.appendChild(opt);
  });
}

// ===============================
// VIDEO
// ===============================
function setupVideoTracking() {
  const video = document.getElementById("safetyVideo");
  const status = document.getElementById("videoStatus");

  video.addEventListener("ended", () => {
    videoCompleted = true;
    status.textContent = "Video completed. Please sign below.";
    status.className = "status-success";
  });
}

// ===============================
// SIGNATURE PAD
// ===============================
function setupSignaturePad() {
  canvas = document.getElementById("signatureCanvas");
  ctx = canvas.getContext("2d");

  resizeCanvas();

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDraw);
  canvas.addEventListener("mouseleave", stopDraw);

  canvas.addEventListener("touchstart", startDraw);
  canvas.addEventListener("touchmove", draw);
  canvas.addEventListener("touchend", stopDraw);

  document
    .getElementById("clearSignature")
    .addEventListener("click", clearSignature);

  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  const data = canvas.toDataURL();
  canvas.width = canvas.offsetWidth;
  canvas.height = 150;

  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffff";

  const img = new Image();
  img.src = data;
  img.onload = () => ctx.drawImage(img, 0, 0);
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const evt = e.touches ? e.touches[0] : e;
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

function startDraw(e) {
  isDrawing = true;
  ctx.beginPath();
  const pos = getPos(e);
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function stopDraw() {
  isDrawing = false;
}

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ===============================
// FORM SUBMIT
// ===============================
function setupFormSubmit() {
  document
    .getElementById("ackForm")
    .addEventListener("submit", submitForm);
}

async function submitForm(e) {
  e.preventDefault();

  if (!TEST_MODE && !videoCompleted) {
    alert("Please watch the entire video before submitting.");
    return;
  }

  const payload = {
    fullName: document.getElementById("fullName").value,
    companyName: document.getElementById("companyName").value,
    jobSite: document.getElementById("jobSite").value,
    email: document.getElementById("email").value,
    signature: canvas.toDataURL("image/png"),
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(LOGIC_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Submit error:", err);
  }

  showSuccessScreen();
}

// ===============================
// SUCCESS SCREEN
// ===============================
function showSuccessScreen() {
  document.getElementById("formSection").classList.add("hidden");
  document.getElementById("successScreen").classList.remove("hidden");

  document.getElementById("submissionTimestamp").textContent =
    "Submitted on: " + new Date().toLocaleString();
}
