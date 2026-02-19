/**********************************************************
 * CONFIG
 **********************************************************/
const LOGIC_APP_URL =
  "https://prod-12.northcentralus.logic.azure.com:443/workflows/bdc21a12c859424288de6c5438494284/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DGjs243f1qFfe7a27mH3jV6PejuwsjYSOoFvtQR8JZQ";

/**********************************************************
 * TEST MODE (video bypass)
 * https://ashy-stone-01abfa810.2.azurestaticapps.net/?test=true
 **********************************************************/
const urlParams = new URLSearchParams(window.location.search);
const IS_TEST_MODE = urlParams.get("test") === "true";

/**********************************************************
 * JOB SITES (HARDCODED)
 **********************************************************/
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

/**********************************************************
 * STATE
 **********************************************************/
const state = {
  videoCompleted: false,
  signatureCompleted: false,
  submitting: false
};

/**********************************************************
 * DOM READY
 **********************************************************/
document.addEventListener("DOMContentLoaded", () => {
  populateJobSites();
  setupSignaturePad();
  setupVideoLogic();
  setupFormSubmit();
  updateSubmitButton();
});

/**********************************************************
 * JOB SITE DROPDOWN
 **********************************************************/
function populateJobSites() {
  const select = document.getElementById("jobSite");
  if (!select) return;

  select.innerHTML = `<option value="">Select a job site</option>`;

  JOB_SITES.forEach(site => {
    const opt = document.createElement("option");
    opt.value = site;
    opt.textContent = site;
    select.appendChild(opt);
  });
}

/**********************************************************
 * SIGNATURE PAD
 **********************************************************/
let canvas, ctx, drawing = false;

function setupSignaturePad() {
  canvas = document.getElementById("signaturePad");
  if (!canvas) return;

  ctx = canvas.getContext("2d");
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#fff";

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
    ?.addEventListener("click", clearSignature);
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  ctx.scale(ratio, ratio);
}

function startDraw(e) {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(getX(e), getY(e));
}

function draw(e) {
  if (!drawing) return;
  ctx.lineTo(getX(e), getY(e));
  ctx.stroke();
}

function stopDraw() {
  if (!drawing) return;
  drawing = false;
  state.signatureCompleted = true;
  updateSubmitButton();
}

function getX(e) {
  return (e.touches ? e.touches[0].clientX : e.clientX) - canvas.getBoundingClientRect().left;
}

function getY(e) {
  return (e.touches ? e.touches[0].clientY : e.clientY) - canvas.getBoundingClientRect().top;
}

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  state.signatureCompleted = false;
  updateSubmitButton();
}

/**********************************************************
 * VIDEO LOGIC
 **********************************************************/
function setupVideoLogic() {
  const video = document.getElementById("safetyVideo");
  const status = document.getElementById("videoStatus");

  if (IS_TEST_MODE) {
    state.videoCompleted = true;
    if (status) {
      status.textContent = "Test mode enabled — video bypassed.";
      status.style.color = "orange";
    }
    return;
  }

  if (!video) return;

  video.addEventListener("ended", () => {
    state.videoCompleted = true;
    if (status) {
      status.textContent = "Video completed. Please sign below.";
      status.style.color = "lime";
    }
    updateSubmitButton();
  });
}

/**********************************************************
 * SUBMIT BUTTON STATE
 **********************************************************/
function updateSubmitButton() {
  const btn = document.getElementById("submitBtn");
  if (!btn) return;

  btn.disabled = !(
    state.videoCompleted &&
    state.signatureCompleted &&
    !state.submitting
  );
}

/**********************************************************
 * FORM SUBMIT
 **********************************************************/
function setupFormSubmit() {
  const form = document.getElementById("ackForm");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (state.submitting) return;

    state.submitting = true;
    updateSubmitButton();

    try {
      await submitForm();
      showSuccessScreen();
    } catch (err) {
      console.error(err);
      alert("Submission failed. Please try again.");
      state.submitting = false;
      updateSubmitButton();
    }
  });
}

/**********************************************************
 * SUBMISSION LOGIC
 **********************************************************/
async function submitForm() {
  const payload = {
    fullName: document.getElementById("fullName").value.trim(),
    companyName: document.getElementById("companyName").value.trim(),
    jobSite: document.getElementById("jobSite").value,
    phone: document.getElementById("phone")?.value || "",
    email: document.getElementById("email").value.trim(),
    signature: canvas.toDataURL("image/png"),
    timestamp: new Date().toISOString()
  };

  const res = await fetch(LOGIC_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error("HTTP " + res.status);
  }
}

/**********************************************************
 * SUBMISSION COMPLETE SCREEN
 **********************************************************/
function showSuccessScreen() {
  document.body.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      background:#000;
      color:#fff;
      text-align:center;
      padding:40px;
    ">
      <h1>Submission Complete</h1>
      <p>Thank you. Your safety acknowledgment has been recorded.</p>
      <p>You may now close this page.</p>
    </div>
  `;
}
