console.log("app.js loaded");

// =====================
// CONFIG
// =====================
const LOGIC_APP_URL = "https://prod-12.northcentralus.logic.azure.com:443/workflows/bdc21a12c859424288de6c5438494284/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DGjs243f1qFfe7a27mH3jV6PejuwsjYSOoFvtQR8JZQ";
const TEST_MODE = true; // set true to bypass video requirement

// =====================
// JOB SITES
// =====================
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

let videoCompleted = false;
let isDrawing = false;
let canvas, ctx;

document.addEventListener("DOMContentLoaded", () => {
  populateJobSites();
  setupVideo();
  setupSignaturePad();
  setupSubmit();
});

// =====================
// JOB SITE DROPDOWN
// =====================
function populateJobSites() {
  const select = document.getElementById("jobSite");
  JOB_SITES.forEach(site => {
    const opt = document.createElement("option");
    opt.value = site;
    opt.textContent = site;
    select.appendChild(opt);
  });
}

// =====================
// VIDEO TRACKING
// =====================
function setupVideo() {
  const video = document.getElementById("safetyVideo");
  const status = document.getElementById("videoStatus");

  video.addEventListener("ended", () => {
    videoCompleted = true;
    status.textContent = "Video completed. Please sign below.";
  });
}

// =====================
// SIGNATURE PAD
// =====================
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
  canvas.width = canvas.offsetWidth;
  canvas.height = 160;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffff";
}

function getPosition(e) {
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
  const pos = getPosition(e);
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPosition(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function stopDraw() {
  isDrawing = false;
}

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// =====================
// SUBMIT
// =====================
function setupSubmit() {
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
    console.error("Submission error:", err);
  }

  showSuccessScreen();
}

// =====================
// SUCCESS SCREEN
// =====================
function showSuccessScreen() {
  const formWrapper = document.getElementById("formWrapper");
  const successScreen = document.getElementById("successScreen");
  const submissionTime = document.getElementById("submissionTime");

  submissionTime.textContent =
    "Submitted on " + new Date().toLocaleString();

  formWrapper.classList.add("hidden");
  successScreen.classList.remove("hidden");

  successScreen.scrollIntoView({ behavior: "smooth" });
}
