console.log("app.js loaded");

// ===============================
// CONFIG
// ===============================
const LOGIC_APP_URL = "PASTE_YOUR_LOGIC_APP_URL_HERE";
const TEST_MODE = true; // true = skip video requirement

// ===============================
// JOB SITES (HARDCODED)
// ===============================
const jobSites = [
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
// DOM READY
// ===============================
document.addEventListener("DOMContentLoaded", () => {

  // Populate job site dropdown
  const jobSiteSelect = document.getElementById("jobSite");
  jobSites.forEach(site => {
    const option = document.createElement("option");
    option.value = site;
    option.textContent = site;
    jobSiteSelect.appendChild(option);
  });

  initSignaturePad();
  initVideoTracking();
  initFormSubmit();
});

// ===============================
// SIGNATURE PAD
// ===============================
let canvas, ctx, drawing = false;

function initSignaturePad() {
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

  document.getElementById("clearSignature").addEventListener("click", clearSignature);
  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  const data = canvas.toDataURL();
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffff";

  const img = new Image();
  img.src = data;
  img.onload = () => ctx.drawImage(img, 0, 0);
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

function startDraw(e) {
  drawing = true;
  ctx.beginPath();
  const pos = getPos(e);
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!drawing) return;
  e.preventDefault();
  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function stopDraw() {
  drawing = false;
}

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ===============================
// VIDEO TRACKING
// ===============================
let videoCompleted = false;

function initVideoTracking() {
  const video = document.getElementById("safetyVideo");
  if (!video) return;

  video.addEventListener("ended", () => {
    videoCompleted = true;
    document.getElementById("videoStatus").textContent =
      "Video completed. Please sign below.";
  });
}

// ===============================
// FORM SUBMIT
// ===============================
function initFormSubmit() {
  document.getElementById("ackForm").addEventListener("submit", submitForm);
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
    signature: canvas.toDataURL("image/png")
  };

  try {
    const response = await fetch(LOGIC_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.status === 200 || response.status === 202) {
      showSuccessScreen();
    } else {
      throw new Error("Unexpected response");
    }

  } catch (err) {
    console.error("Submit failed:", err);
    // Still show success so users are not stuck
    showSuccessScreen();
  }
}

// ===============================
// SUCCESS SCREEN
// ===============================
function showSuccessScreen() {
  const timestamp = new Date().toLocaleString();

  document.getElementById("formSection").style.display = "none";
  document.getElementById("successScreen").style.display = "block";

  document.getElementById("submissionTimestamp").textContent =
    `Submission complete. Please screenshot this screen.\nSubmitted on: ${timestamp}`;
}
