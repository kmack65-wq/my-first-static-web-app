console.log("script.js loaded");

const state = {
  videoCompleted: false,
  signatureCompleted: false,
  player: null
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(message) {
  const el = $("status");
  if (el) el.textContent = message;
}

function updateSubmitState() {
  const btn = $("submitBtn");
  if (!btn) return;

  btn.disabled = !(state.videoCompleted && state.signatureCompleted);

  if (!state.videoCompleted) {
    setStatus("Please watch the entire safety video.");
  } else if (!state.signatureCompleted) {
    setStatus("Please sign before submitting.");
  } else {
    setStatus("Ready to submit.");
  }

  console.log("Submit state:", {
    videoCompleted: state.videoCompleted,
    signatureCompleted: state.signatureCompleted,
    disabled: btn.disabled
  });
}

/* ================= SIGNATURE PAD ================= */
function initSignaturePad() {
  const canvas = $("signaturePad");
  const clearBtn = $("clearSignature");
  if (!canvas) {
    console.warn("Signature canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  let drawing = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const x = (touch ? touch.clientX : e.clientX) - rect.left;
    const y = (touch ? touch.clientY : e.clientY) - rect.top;
    return { x, y };
  }

  function start(e) {
    drawing = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.preventDefault();
  }

  function move(e) {
    if (!drawing) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    state.signatureCompleted = true;
    updateSubmitState();
    e.preventDefault();
  }

  function stop() {
    drawing = false;
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", stop);

  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", stop);

  clearBtn?.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.signatureCompleted = false;
    updateSubmitState();
  });

  console.log("Signature pad initialized");
}

/* ================= YOUTUBE PLAYER ================= */
window.onYouTubeIframeAPIReady = function () {
  console.log("YouTube API ready");

  state.player = new YT.Player("trainingVideo", {
    events: {
      onReady: () => {
        console.log("YouTube player ready");
        updateSubmitState();
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.ENDED) {
          console.log("Video completed");
          state.videoCompleted = true;
          updateSubmitState();
        }
      },
      onError: (e) => {
        console.error("YouTube error:", e);
        setStatus("Video failed to load. Please refresh.");
      }
    }
  });
};

/* ================= FORM GUARD ================= */
function initFormGuard() {
  const form = $("ackForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    if (!state.videoCompleted) {
      e.preventDefault();
      alert("Please watch the entire safety video.");
      return;
    }
    if (!state.signatureCompleted) {
      e.preventDefault();
      alert("Please sign before submitting.");
      return;
    }
    console.log("Form passed guard");
  });
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  initSignaturePad();
  initFormGuard();
  updateSubmitState();
});
