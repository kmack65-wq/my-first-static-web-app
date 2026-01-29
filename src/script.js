let videoCompleted = false;
let signatureCompleted = false;
let player;

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

  window.addEventListener("mouseup", () => drawing = false);

  $("clearSignature").onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    signatureCompleted = false;
    updateSubmitState();
  };
})();

/* ---------- YOUTUBE ---------- */
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player("trainingVideo", {
    events: {
      onStateChange: e => {
        if (e.data === YT.PlayerState.ENDED) {
          videoCompleted = true;
          setStatus("Video completed.");
          updateSubmitState();
        }
      }
    }
  });
};
