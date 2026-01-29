/*********************************
 * GLOBAL STATE MANAGEMENT
 *********************************/
const safetyState = {
  videoCompleted: false,
  signatureCompleted: false,
  player: null
};

// Make state accessible globally for debugging
window.safetyState = safetyState;

/*********************************
 * UTILITY FUNCTIONS
 *********************************/
function $(id) {
  return document.getElementById(id);
}

function setStatus(msg, type = 'info') {
  const el = $('#status');
  if (!el) return;
  
  el.textContent = msg;
  el.className = `status-${type}`;
  
  // Add CSS classes if needed
  if (!document.querySelector('.status-style')) {
    const style = document.createElement('style');
    style.className = 'status-style';
    style.textContent = `
      #status { margin-top: 10px; padding: 10px; border-radius: 5px; }
      .status-info { background: #1e3a8a; color: white; }
      .status-error { background: #7f1d1d; color: white; }
      .status-success { background: #065f46; color: white; }
    `;
    document.head.appendChild(style);
  }
}

/*********************************
 * UPDATE SUBMIT BUTTON STATE
 *********************************/
function updateSubmitState() {
  const btn = $('#submitBtn');
  if (!btn) return;
  
  const isEnabled = safetyState.videoCompleted && safetyState.signatureCompleted;
  btn.disabled = !isEnabled;
  
  // Update button styling
  if (isEnabled) {
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else {
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';
  }
  
  // Update status message
  if (!safetyState.videoCompleted) {
    setStatus('Please watch the entire safety video.', 'info');
  } else if (!safetyState.signatureCompleted) {
    setStatus('Please provide your signature.', 'info');
  } else {
    setStatus('Ready to submit your acknowledgement.', 'success');
  }
}

/*********************************
 * JOB SITE → SUPERINTENDENT MAP
 *********************************/
const superintendentMap = {
  "25-129 PHC Cardiac Rehab": "John Smith",
  "25-103 Ajax Memphis": "Lisa Johnson",
  "25-120 Blue Cloud Pittsburg": "Mike Rodriguez",
  "24-116 BS-MOB 2 / Addition": "Sarah Williams",
  "25-131 Eagle Point Expansion": "David Brown",
  "25-116 Harcros Chemical": "Emily Davis",
  "25-127 Alton Memorial SLCH Therapy": "Robert Taylor",
  "25-126 Blue Cloud Toledo": "Jennifer Wilson",
  "25-114 Mapletree Corp": "Michael Martinez",
  "364 Logistics Center": "Patricia Anderson",
  "25-132 Blue Cloud Charlotte": "James Thomas",
  "25-134 Blue Cloud Reno": "Linda Jackson",
  "25-105 MBMC Switchgear": "Christopher White",
  "25-111 PHC Power Plant": "Barbara Harris",
  "23-159 BJH CPAP Renovation/ Change Order": "Daniel Martin",
  "25-130 Kuna Freezer Expansion": "Susan Thompson",
  "25-121 ABC Supply": "Paul Garcia",
  "RMMC CO": "Jessica Martinez",
  "Fondren Surgical Suites": "Kevin Robinson"
};

// Initialize job site change listener
const jobSiteSelect = $('#jobSite');
const superintendentInput = $('#superintendent');

if (jobSiteSelect && superintendentInput) {
  jobSiteSelect.addEventListener('change', () => {
    const selectedSite = jobSiteSelect.value;
    superintendentInput.value = superintendentMap[selectedSite] || '';
  });
}

/*********************************
 * SIGNATURE PAD (WHITE PEN)
 *********************************/
function initSignaturePad() {
  const canvas = $('#signaturePad');
  const clearBtn = $('#clearSignature');
  
  if (!canvas) {
    console.warn('Signature canvas not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  let drawing = false;
  
  // Set canvas size and styles
  function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    
    // Clear any existing drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Drawing functions
  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  }
  
  function startDrawing(e) {
    drawing = true;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.preventDefault();
  }
  
  function draw(e) {
    if (!drawing) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Mark signature as completed
    safetyState.signatureCompleted = true;
    updateSubmitState();
  }
  
  function stopDrawing() {
    drawing = false;
  }
  
  // Mouse events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // Touch events for mobile
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e.touches[0]);
  });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e.touches[0]);
  });
  
  canvas.addEventListener('touchend', stopDrawing);
  
  // Clear signature
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      safetyState.signatureCompleted = false;
      updateSubmitState();
      setStatus('Signature cleared. Please sign again.', 'info');
    });
  }
}

/*********************************
 * YOUTUBE VIDEO GATING
 *********************************/
window.onYouTubeIframeAPIReady = function() {
  const videoId = 'trainingVideo';
  const playerEl = $(videoId);
  
  if (!playerEl) {
    console.error('YouTube video element not found');
    return;
  }
  
  safetyState.player = new YT.Player(videoId, {
    events: {
      onReady: () => {
        console.log('YouTube player ready');
        setStatus('Video loaded. Please watch completely.', 'info');
      },
      onStateChange: (event) => {
        // Video state changed
        console.log('YouTube player state:', event.data);
        
        // 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING
        if (event.data === YT.PlayerState.ENDED) {
          safetyState.videoCompleted = true;
          setStatus('Video completed! Now please sign.', 'success');
          updateSubmitState();
        }
      },
      onError: (error) => {
        console.error('YouTube player error:', error);
        setStatus('Video error. Please refresh the page.', 'error');
      }
    }
  });
};

/*********************************
 * FORM SUBMISSION GUARD
 *********************************/
function initFormGuard() {
  const form = $('#ackForm');
  if (!form) return;
  
  form.addEventListener('submit', (e) => {
    // Prevent submission if requirements aren't met
    if (!safetyState.videoCompleted) {
      e.preventDefault();
      setStatus('Please watch the entire video before submitting.', 'error');
      alert('Please watch the entire safety video before submitting.');
      return;
    }
    
    if (!safetyState.signatureCompleted) {
      e.preventDefault();
      setStatus('Please provide your signature before submitting.', 'error');
      alert('Please sign the acknowledgement form.');
      return;
    }
    
    // Form is valid - let app.js handle the submission
    console.log('Form submission guard passed');
    setStatus('Submitting your acknowledgement...', 'info');
  });
}

/*********************************
 * INITIALIZATION
 *********************************/
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing safety acknowledgement form...');
  
  // Initialize components
  initSignaturePad();
  initFormGuard();
  updateSubmitState();
  
  // Add event listeners for form validation
  const formInputs = document.querySelectorAll('#ackForm input, #ackForm select');
  formInputs.forEach(input => {
    input.addEventListener('input', updateSubmitState);
    input.addEventListener('change', updateSubmitState);
  });
  
  setStatus('Please watch the safety video and complete the form.', 'info');
});

/*********************************
 * DEBUG HELPERS (for testing)
 *********************************/
window._debug = {
  markVideoComplete: () => {
    safetyState.videoCompleted = true;
    updateSubmitState();
    console.log('DEBUG: Video marked as complete');
  },
  markSignatureComplete: () => {
    safetyState.signatureCompleted = true;
    updateSubmitState();
    console.log('DEBUG: Signature marked as complete');
  },
  resetAll: () => {
    safetyState.videoCompleted = false;
    safetyState.signatureCompleted = false;
    updateSubmitState();
    console.log('DEBUG: State reset');
  },
  getState: () => ({ ...safetyState })
};