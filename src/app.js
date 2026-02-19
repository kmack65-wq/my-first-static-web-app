console.log("app.js loaded");

/* =========================
   CONFIG
========================= */

const LOGIC_APP_URL =
  "https://prod-12.northcentralus.logic.azure.com:443/workflows/bdc21a12c859424288de6c5438494284/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DGjs243f1qFfe7a27mH3jV6PejuwsjYSOoFvtQR8JZQ";

// ⚠️ SET TO true FOR TESTING (skips video requirement)
const SKIP_VIDEO_CHECK = true;

/* =========================
   DOM READY
========================= */

document.addEventListener("DOMContentLoaded", () => {
  setupJobSites();
  setupSignaturePad();
  setupFormSubmit();
});

/* =========================
   JOB SITES (HARDCODED)
========================= */

function setupJobSites() {
  const jobSiteSelect = document.getElementById("jobSite");

  if (!jobSiteSelect) {
    console.error("Job site dropdown not found");
    return;
  }

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

  jobSiteSelect.innerHTML = `<option value="">Select a job site</option>`;

  jobSites.forEach(site => {
    const option = document.createElement("option");
    option.value = site;
    option.textContent = site;
    jobSiteSelect.appendChild(option);
  });

  console.log("Job sites loaded:", jobSites.length);
}

/* =========================
   SIGNATURE PAD (FIXED)
========================= */

let isDrawing = false;
let ctx;
let canvas;

function setupSignaturePad() {
  canvas = document.getElementById("signatureCanvas");
  if (!canvas) {
    console.error("Signature canvas not found");
    return;
  }

  ctx = canvas.getContext("2d");
  resizeCanvas();

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", endDraw);
  canvas.addEventListener("mouseleave", endDraw);

  canvas.addEventListener("touchstart", startDraw);
  canvas.addEventListener("touchmove", draw);
  canvas.addEventListener("touchend", endDraw);

  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

function startDraw(e) {
  isDrawing = true;
  ctx.beginPath();
  ctx.moveTo(getX(e), getY(e));
}

function draw(e) {
  if (!isDrawing) return;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#fff";
  ctx.lineTo(getX(e), getY(e));
  ctx.stroke();
}

function endDraw() {
  isDrawing = false;
}

function getX(e) {
  return (e.touches ? e.touches[0].clientX : e.clientX) - canvas.getBoundingClientRect().left;
}

function getY(e) {
  return (e.touches ? e.touches[0].clientY : e.clientY) - canvas.getBoundingClientRect().top;
}

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* =========================
   FORM SUBMISSION
========================= */

function setupFormSubmit() {
  const form = document.getElementById("ackForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!SKIP_VIDEO_CHECK && !window.videoCompleted) {
      alert("You must watch the full video.");
      return;
    }

    const signatureData = canvas.toDataURL("image/png");

    const payload = {
      fullName: form.fullName.value,
      companyName: form.companyName.value,
      jobSite: form.jobSite.value,
      phone: form.phone.value,
      email: form.email.value,
      signature: signatureData,
      timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch(LOGIC_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Submit failed");

      showSuccessScreen();
    } catch (err) {
      console.error(err);
      alert("Submission failed. Please try again.");
    }
  });
}

/* =========================
   SUCCESS SCREEN
========================= */

function showSuccessScreen() {
  document.body.innerHTML = `
    <div style="
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      height:100vh;
      background:#000;
      color:#0f0;
      font-size:22px;
      text-align:center;">
      <h1>✅ Submission Complete</h1>
      <p>Your safety acknowledgement has been recorded.</p>
    </div>
  `;
}
