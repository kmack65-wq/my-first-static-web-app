let videoCompleted = false;
let signatureCompleted = false;

const $ = id => document.getElementById(id);

function updateSubmitState() {
  $("submitBtn").disabled = !(videoCompleted && signatureCompleted);
}

function setStatus(msg) {
  $("status").textContent = msg;
}

/* ---------- SIGNATURE (MOUSE + TOUCH) ---------- */
(() => {
  const canvas = $("signaturePad");
  const ctx = canvas.getContext("2d");
  let drawing = false;

  // Improve resolution on mobile
  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffff"; // White pen


  function getPosition(e) {
    const rect = canvas.getBoundingClientRect();

    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    return {
      x: e.offsetX,
      y: e.offsetY
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const pos = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPosition(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    signatureCompleted = true;
    updateSubmitState();
  }

  function endDraw() {
    drawing = false;
  }

  // Mouse events
  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  window.addEventListener("mouseup", endDraw);

  // Touch events
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", draw, { passive: false });
  window.addEventListener("touchend", endDraw);

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


