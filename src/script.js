let videoCompleted = false;
let signatureCompleted = false;

const $ = id => document.getElementById(id);

function updateSubmitState() {
  $("submitBtn").disabled = !(videoCompleted && signatureCompleted);
}

function setStatus(msg) {
  $("status").textContent = msg;
}

/* ---------- SIGNATURE ---------- */
(() => {
  const canvas = $("signaturePad");
  const ctx = canvas.getContext("2d");
  let drawing = false;

  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  canvas.addEventListener("mousedown", e => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });

  canvas.addEventListener("mousemove", e => {
    if (!drawing) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    signatureCompleted = true;
    updateSubmitState();
  });

  window.addEventListener("mouseup", () => {
    drawing = false;
  });

  $("clearSignature").onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    signatureCompleted = false;
    updateSubmitState();
  };
})();

/* ---------- SAFETY VIDEO (AZURE BLOB) ---------- */
(() => {
  const video = $("safetyVideo");

  if (!video) {
    console.error("Safety video element not found.");
    return;
  }

  // Initial state
  videoCompleted = false;
  updateSubmitState();
  setStatus("You must watch the entire safety video.");

  // Prevent skipping ahead
  let lastAllowedTime = 0;

  video.addEventListener("timeupdate", () => {
    if (video.currentTime > lastAllowedTime + 1) {
      video.currentTime = lastAllowedTime;
    } else {
      lastAllowedTime = video.currentTime;
    }
  });

  // Mark completion
  video.addEventListener("ended", () => {
    videoCompleted = true;
    setStatus("Video completed.");
    updateSubmitState();
  });

  // Extra guard (in case user tries to submit early)
  $("ackForm").addEventListener("submit", e => {
    if (!videoCompleted) {
      e.preventDefault();
      alert("You must watch the entire safety video before submitting.");
    }
  });
})();
