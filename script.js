/* ============================================================
 * Course/Topic : BCSE203E - Web Programming | Digital Assignment - II
 * Project Name : SereniMind — Student Mental Wellness Companion
 * File         : script.js
 * Description  : Core application logic. Handles navigation,
 *                breathing exercise, Pomodoro timer, mood
 *                tracking (with localStorage), and affirmations.
 *
 * Key JavaScript concepts demonstrated:
 *   - DOM manipulation (getElementById, querySelector, classList)
 *   - Timers: setTimeout, setInterval, clearInterval
 *   - Web Audio API — programmatic sound generation
 *   - IntersectionObserver API — scroll-triggered animations
 *   - localStorage — persistent data across page reloads
 *   - JSON.stringify / JSON.parse — serialising data structures
 *   - Array methods: forEach, Math.random, Math.floor
 *   - Template literals and ternary operators
 *   - SVG manipulation (strokeDashoffset) for circular progress
 * ============================================================ */


// ══════════════════════════════════════════════════════════════
// 1. NAVIGATION & SCROLL-REVEAL
// ══════════════════════════════════════════════════════════════

// Grab the hamburger toggle button and the nav link container from the DOM
const navToggle  = document.getElementById('navToggle');
const navLinksEl = document.getElementById('navLinks');

// Only attach the click listener if the element exists (safety check)
if (navToggle) {
    // Toggle the 'open' CSS class to slide the mobile menu in/out
    navToggle.addEventListener('click', () => navLinksEl.classList.toggle('open'));
}

// Close the mobile menu automatically when the user taps any nav link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navLinksEl.classList.remove('open'));
});

/**
 * updateActiveNav — highlights the nav link that matches the
 * section currently visible in the viewport.
 *
 * How it works:
 *   1. Loop through every section that has an id attribute.
 *   2. If the page has scrolled past a section's top (minus 130px
 *      buffer), record that section's id as "current".
 *   3. Remove 'active' from all links, then re-add it only to the
 *      link whose href matches "#current".
 */
function updateActiveNav() {
    const sections = document.querySelectorAll('.section[id]'); // all named sections
    const links    = document.querySelectorAll('.nav-link');
    let current    = ''; // will hold the id of the in-view section

    sections.forEach(s => {
        // offsetTop gives the section's distance from the top of the page
        // We subtract 130px so the link lights up slightly before the
        // section reaches the very top of the screen
        if (window.scrollY >= s.offsetTop - 130) current = s.id;
    });

    links.forEach(l => {
        l.classList.remove('active'); // clear all first
        // Compare each link's href ("#breathe", "#focus" etc.) to the current id
        if (l.getAttribute('href') === `#${current}`) l.classList.add('active');
    });
}

/**
 * initScrollReveal — uses the IntersectionObserver API to animate
 * elements into view when they enter the visible portion of the page.
 *
 * Elements with class .reveal start invisible (opacity: 0, Y-shifted).
 * Once observed to be at least 15% visible, the 'visible' class is
 * added which triggers the CSS transition to full opacity/position.
 * observer.unobserve() ensures the animation fires only once per element.
 */
function initScrollReveal() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add 'visible' to trigger the CSS fade-in + slide-up
                    entry.target.classList.add('visible');
                    // Stop watching after it has animated in — saves memory
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15 } // fire when 15% of the element is in view
    );

    // Register every element marked for reveal with the observer
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Listen for scroll events to keep the nav link highlight in sync.
// { passive: true } tells the browser we won't call preventDefault(),
// allowing it to optimise scrolling performance.
window.addEventListener('scroll', updateActiveNav, { passive: true });


// ══════════════════════════════════════════════════════════════
// 2. BREATHING EXERCISE
// ══════════════════════════════════════════════════════════════

// Default durations in seconds for each phase of the breathing cycle
let breatheConfig = { inhale: 4, hold: 4, exhale: 6 };

// Flag: is the breathing exercise currently running?
let breatheRunning = false;

// We store all setTimeout IDs here so we can cancel them cleanly on pause
let breatheTimeouts = [];

// Reference to the repeating interval that counts down each phase
let breatheCountdown = null;

/**
 * adjustTiming — called by the +/− buttons on the UI.
 * Clamps the new value between 1 and 10 seconds.
 *
 * @param {string} phase - 'inhale' | 'hold' | 'exhale'
 * @param {number} delta - +1 to increase, -1 to decrease
 */
function adjustTiming(phase, delta) {
    // Prevent changes while the exercise is active so the active cycle
    // isn't disrupted mid-breath
    if (breatheRunning) return;

    // Math.max / Math.min clamp the value between 1 and 10
    breatheConfig[phase] = Math.max(1, Math.min(10, breatheConfig[phase] + delta));

    // Update the displayed number next to the +/− buttons
    document.getElementById(`${phase}Time`).textContent = breatheConfig[phase];
}

/**
 * toggleBreathing — start or pause the breathing exercise.
 * Flips the button label and delegates to the cycle runner.
 */
function toggleBreathing() {
    const btn = document.getElementById('breatheBtn');

    if (breatheRunning) {
        // Currently running → pause and clean up
        stopBreathing();
        btn.textContent = '▶ Start';
    } else {
        // Not running → begin
        breatheRunning = true;
        btn.textContent = '⏸ Pause';

        // Activate the glowing outer ring CSS animation
        document.getElementById('breatheRing').classList.add('active');

        // Start the first breath cycle
        runBreatheCycle();
    }
}

/**
 * runBreatheCycle — executes one complete Inhale → Hold → Exhale
 * sequence using nested setTimeout calls, then calls itself again
 * to create an infinite loop until paused.
 *
 * Each phase:
 *   1. Updates the circle's CSS class (which drives the CSS size transition)
 *   2. Updates the instructional text
 *   3. Starts the per-second countdown display
 *   4. Schedules the next phase after the phase duration elapses
 */
function runBreatheCycle() {
    // Guard: stop immediately if paused between nested timeouts
    if (!breatheRunning) return;

    const circle = document.getElementById('breatheCircle');
    const text   = document.getElementById('breatheText');

    // Destructure to get the three durations in seconds
    const { inhale, hold, exhale } = breatheConfig;

    // ── Phase 1: INHALE ──────────────────────────────────────
    // Set CSS transition duration to match the inhale timing so the circle
    // expands smoothly over exactly those seconds
    circle.style.transition = `all ${inhale}s ease-in-out`;
    circle.className = 'breathe-circle inhale'; // triggers CSS expansion
    text.textContent = 'Inhale 🫁';
    startPhaseCountdown(inhale); // show ticking number inside circle

    // Schedule the Hold phase to begin after the inhale is done
    const t1 = setTimeout(() => {
        if (!breatheRunning) return; // re-check in case paused during wait

        // ── Phase 2: HOLD ────────────────────────────────────
        // Quick 0.4s transition keeps the circle at full size (no resize)
        circle.style.transition = 'all 0.4s ease';
        circle.className = 'breathe-circle hold';
        text.textContent = 'Hold 🌟';
        startPhaseCountdown(hold);

        // Schedule the Exhale phase after the hold duration
        const t2 = setTimeout(() => {
            if (!breatheRunning) return;

            // ── Phase 3: EXHALE ──────────────────────────────
            // Transition over exhale seconds so the circle shrinks slowly
            circle.style.transition = `all ${exhale}s ease-in-out`;
            circle.className = 'breathe-circle exhale'; // triggers CSS shrink
            text.textContent = 'Exhale 💨';
            startPhaseCountdown(exhale);

            // After exhale completes, loop back to the start
            const t3 = setTimeout(() => {
                runBreatheCycle(); // recursive call = infinite loop
            }, exhale * 1000);

            breatheTimeouts.push(t3); // track for cleanup
        }, hold * 1000);

        breatheTimeouts.push(t2);
    }, inhale * 1000);

    breatheTimeouts.push(t1);
}

/**
 * startPhaseCountdown — displays a live second counter inside
 * the breathing circle for user awareness of phase duration.
 *
 * Clears any existing interval first to avoid overlapping countdowns.
 *
 * @param {number} seconds - total seconds to count down from
 */
function startPhaseCountdown(seconds) {
    clearInterval(breatheCountdown); // kill any previous countdown

    let remaining = seconds;
    const el = document.getElementById('breatheTimer');
    el.textContent = remaining; // show immediately before first tick

    // Decrement every 1000ms until the phase ends
    breatheCountdown = setInterval(() => {
        remaining--;
        // Show the number, or blank it out when it hits zero
        el.textContent = remaining > 0 ? remaining : '';
        if (remaining <= 0) clearInterval(breatheCountdown);
    }, 1000);
}

/**
 * stopBreathing — cancels all pending timeouts and intervals,
 * then resets the circle and text to the idle state.
 */
function stopBreathing() {
    breatheRunning = false;

    // Cancel every queued phase timeout so nothing fires after pausing
    breatheTimeouts.forEach(id => clearTimeout(id));
    breatheTimeouts = []; // empty the tracking array

    clearInterval(breatheCountdown); // stop the countdown ticker

    // Reset the circle visually back to its resting small size
    const circle = document.getElementById('breatheCircle');
    circle.style.transition = 'all 0.5s ease';
    circle.className = 'breathe-circle'; // removes inhale/hold/exhale modifier

    // Clear text content inside the circle
    document.getElementById('breatheText').textContent  = 'Start';
    document.getElementById('breatheTimer').textContent = '';

    // Remove the glowing ring animation
    document.getElementById('breatheRing').classList.remove('active');
}


// ══════════════════════════════════════════════════════════════
// 3. POMODORO FOCUS TIMER
// ══════════════════════════════════════════════════════════════

// The SVG circle's stroke circumference must match the HTML (r = 110).
// Formula: 2 × π × radius = 2 × 3.14159 × 110 ≈ 691.15 px
// This value is used to animate the stroke-dashoffset, which
// progressively "undraws" the circle as time passes.
const TIMER_CIRCUM = 2 * Math.PI * 110; // ≈ 691.15 px

/**
 * timerState — single source of truth for the Pomodoro timer.
 * All timer functions read from and write to this object.
 */
const timerState = {
    totalSecs:     25 * 60, // total duration of the current mode
    remainingSecs: 25 * 60, // seconds left on the clock
    isRunning:     false,   // true while the interval is ticking
    interval:      null,    // holds the setInterval reference
    mode:          'focus', // 'focus' | 'break' | 'longbreak'
    session:       1        // increments after each focus block
};

/**
 * setTimerMode — called when the user clicks a mode button
 * (Focus / Break / Long Break). Resets the timer to that mode's
 * duration. Blocked while the timer is running to avoid mid-session
 * mode changes.
 *
 * @param {HTMLElement} btn - the clicked mode button element
 */
function setTimerMode(btn) {
    if (timerState.isRunning) return; // don't switch while counting down

    // Remove 'active' highlight from all mode buttons, then add to clicked one
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Read duration and type from the button's data-* attributes
    const mins          = parseInt(btn.dataset.minutes);
    timerState.mode     = btn.dataset.type;        // e.g. 'focus'
    timerState.totalSecs     = mins * 60;          // convert minutes → seconds
    timerState.remainingSecs = mins * 60;          // reset countdown to full

    // Refresh all visual components
    updateTimerDisplay();
    updateTimerProgress();
    updateTimerLabel();
}

/**
 * toggleTimer — start or pause the countdown.
 * Uses setInterval to tick every 1 second.
 */
function toggleTimer() {
    const btn = document.getElementById('timerBtn');

    if (timerState.isRunning) {
        // Pause: clear the interval and update button text
        clearInterval(timerState.interval);
        timerState.isRunning  = false;
        btn.textContent = '▶ Resume';
    } else {
        // Start: begin ticking every second
        timerState.isRunning  = true;
        btn.textContent = '⏸ Pause';

        timerState.interval = setInterval(() => {
            // If time is up, hand off to the completion handler
            if (timerState.remainingSecs <= 0) { timerComplete(); return; }

            timerState.remainingSecs--; // tick down one second
            updateTimerDisplay();      // update the MM:SS text
            updateTimerProgress();     // re-draw the SVG ring
        }, 1000);
    }
}

/**
 * resetTimer — cancels the countdown and restores the full
 * duration for the current mode without switching mode.
 */
function resetTimer() {
    clearInterval(timerState.interval);
    timerState.isRunning     = false;
    // Restore to the full duration of the currently selected mode
    timerState.remainingSecs = timerState.totalSecs;
    document.getElementById('timerBtn').textContent = '▶ Start';
    updateTimerDisplay();
    updateTimerProgress();
}

/**
 * skipTimer — immediately ends the current phase and triggers
 * the same logic as a natural completion (auto-switch mode).
 */
function skipTimer() {
    clearInterval(timerState.interval);
    timerState.isRunning = false;
    timerComplete(); // treat as if time ran out naturally
}

/**
 * timerComplete — called when the countdown reaches zero.
 * Plays a notification sound, increments the session counter,
 * and auto-switches to the next appropriate mode:
 *   Focus → Short Break (or Long Break every 4th session)
 *   Break → Focus
 */
function timerComplete() {
    clearInterval(timerState.interval);
    timerState.isRunning = false;
    playNotificationSound(); // gentle audio cue

    if (timerState.mode === 'focus') {
        timerState.session++; // increment focus session count

        // Every 4th completed focus session → long break; otherwise short break
        // session % 4 === 0 means we're at session 4, 8, 12, …
        switchToMode(timerState.session % 4 === 0 ? 'longbreak' : 'break');
    } else {
        // Break is done → back to focus
        switchToMode('focus');
    }

    document.getElementById('timerBtn').textContent = '▶ Start';
    updateTimerLabel(); // refresh session number display
}

/**
 * switchToMode — internal mode switch without requiring a button click.
 * Useful for auto-switching after a session completes.
 *
 * @param {string} mode - 'focus' | 'break' | 'longbreak'
 */
function switchToMode(mode) {
    // Map each mode name to its standard Pomodoro duration
    const DURATIONS = { focus: 25, break: 5, longbreak: 15 };

    timerState.mode          = mode;
    timerState.totalSecs     = DURATIONS[mode] * 60; // minutes → seconds
    timerState.remainingSecs = timerState.totalSecs;  // reset to full

    // Sync the mode button highlight to the new mode
    document.querySelectorAll('.mode-btn').forEach(btn => {
        // Toggle 'active' class: true if this button's type matches the new mode
        btn.classList.toggle('active', btn.dataset.type === mode);
    });

    updateTimerDisplay();
    updateTimerProgress();
}

/**
 * updateTimerDisplay — formats remainingSecs as MM:SS and
 * injects it into the large clock text element.
 * padStart(2, '0') ensures "5:3" renders correctly as "05:03".
 */
function updateTimerDisplay() {
    const m = Math.floor(timerState.remainingSecs / 60); // whole minutes
    const s = timerState.remainingSecs % 60;             // leftover seconds
    document.getElementById('timerDigits').textContent =
        `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * updateTimerProgress — redraws the SVG circular progress ring.
 *
 * stroke-dasharray is set to the full circumference, and
 * stroke-dashoffset controls how much of that circle is "hidden".
 *   offset = 0           → full ring visible (timer at 100%)
 *   offset = CIRCUM      → ring completely hidden (timer at 0%)
 *
 * Each mode gets a unique colour so the user can glance at the
 * ring colour to know whether they're in Focus, Break, or Long Break.
 */
function updateTimerProgress() {
    const fill     = document.getElementById('timerFill');
    const progress = timerState.remainingSecs / timerState.totalSecs; // 0.0–1.0

    // Multiply remaining fraction by the full circumference to get offset
    fill.style.strokeDashoffset = TIMER_CIRCUM * progress; // shrinks clockwise

    // Colour coding per mode
    const COLORS = { focus: '#a855f7', break: '#06b6d4', longbreak: '#3b82f6' };
    fill.style.stroke = COLORS[timerState.mode] || '#a855f7';
}

/**
 * updateTimerLabel — refreshes the mode title and session number
 * displayed inside the SVG circle.
 */
function updateTimerLabel() {
    const LABELS = { focus: '🎯 Focus Time', break: '☕ Short Break', longbreak: '🌿 Long Break' };
    document.getElementById('timerLabel').textContent   = LABELS[timerState.mode];
    document.getElementById('timerSession').textContent = `Session ${timerState.session}`;
}

/**
 * playNotificationSound — generates a gentle 528 Hz sine wave
 * using the Web Audio API. The gain is ramped to near-zero
 * exponentially so the tone fades out smoothly over 1.8 seconds.
 *
 * Wrapped in try/catch because AudioContext requires user interaction
 * (autoplay policy) and may throw in some browser environments.
 */
function playNotificationSound() {
    try {
        // Create an audio processing graph: oscillator → gain → speakers
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator(); // generates the raw tone
        const gain = ctx.createGain();        // controls volume

        osc.connect(gain);          // oscillator feeds into gain node
        gain.connect(ctx.destination); // gain node feeds into speakers

        osc.frequency.value = 528;  // "Solfeggio" healing tone (Hz)
        osc.type            = 'sine'; // smooth sine wave (least harsh)
        gain.gain.value     = 0.25;   // start at 25% volume

        osc.start(); // begin sound immediately

        // Schedule exponential volume fade to near-zero over 1.8 seconds
        // exponentialRamp cannot go all the way to 0 (division by zero),
        // so we use a very small value (0.001) as the target
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        osc.stop(ctx.currentTime + 1.8); // stop oscillator after fade
    } catch (_) {
        /* Silently ignore — sound is non-critical for app function */
    }
}


// ══════════════════════════════════════════════════════════════
// 4. MOOD TRACKER
// ══════════════════════════════════════════════════════════════

/**
 * MOOD_SCORES — maps each mood emoji key to a numeric score (0–100).
 * Used to calculate the weekly average for the trend comment.
 * Scores are subjective but ordered from most positive to least.
 */
const MOOD_SCORES = {
    excited: 100, happy: 85, calm: 70, neutral: 50,
    tired:    35, sad:   25, stressed: 15, angry: 10
};

/**
 * getMoodComment — returns a tailored motivational message
 * based on the user's average weekly mood score.
 *
 * @param {number} avg - average mood score 0–100
 * @returns {string} contextual encouragement message
 */
function getMoodComment(avg) {
    if (avg >= 80) return "You've had a wonderful week! Keep riding those good vibes 🌟";
    if (avg >= 65) return "Pretty solid week overall — you're doing great 😊";
    if (avg >= 50) return "A mixed bag, but that's life! You're handling it 👏";
    if (avg >= 35) return "It's been a tough one. Be extra gentle with yourself this week 🫂";
    return "Sending you the biggest virtual hug. Things will get better 💜";
}

// Holds the emoji/mood/label of the user's current selection before saving
let selectedMood = null;

/**
 * selectMood — handles clicking an emoji mood button.
 * Highlights the selected emoji, updates the confirmation text,
 * and reveals the optional comment textarea.
 *
 * @param {HTMLElement} btn - the clicked emoji button
 */
function selectMood(btn) {
    // Remove 'selected' highlight from any previously chosen emoji
    document.querySelectorAll('.mood-emoji').forEach(e => e.classList.remove('selected'));

    // Highlight the clicked emoji
    btn.classList.add('selected');

    // Store the selection in a variable so saveMood() can use it
    selectedMood = {
        emoji: btn.textContent.trim(), // e.g. "😊"
        mood:  btn.dataset.mood,       // e.g. "happy" (used for scoring)
        label: btn.dataset.label       // e.g. "Happy" (human-readable)
    };

    // Show confirmation text below the emoji grid
    document.getElementById('moodSelected').innerHTML =
        `<p>You're feeling <strong>${selectedMood.label}</strong> ${selectedMood.emoji}</p>`;

    // Reveal the textarea so the user can optionally explain their mood
    document.getElementById('moodCommentWrap').style.display = 'block';

    // Enable the Save button now that a mood has been picked
    document.getElementById('saveMoodBtn').disabled = false;
}

// Live character counter for the optional reason textarea
const commentEl = document.getElementById('moodComment');
if (commentEl) {
    commentEl.addEventListener('input', () => {
        // Update the "X/120" counter text on every keystroke
        document.getElementById('moodCommentCount').textContent =
            `${commentEl.value.length}/120`;
    });
}

/**
 * saveMood — persists today's mood + optional comment to localStorage.
 * Uses today's date string (YYYY-MM-DD) as the key so each day has
 * exactly one entry. Resets the UI and re-renders the weekly grid.
 */
function saveMood() {
    if (!selectedMood) return; // nothing selected — should not happen

    const today   = getTodayStr();                                        // "2025-04-06"
    const comment = (document.getElementById('moodComment')?.value || '').trim();
    const history = getMoodHistory();                                     // existing data

    // Add or overwrite today's entry in the history object
    history[today] = {
        emoji:   selectedMood.emoji,
        mood:    selectedMood.mood,
        label:   selectedMood.label,
        comment: comment,               // may be empty string — that's fine
        savedAt: new Date().toISOString() // ISO timestamp for reference
    };

    // Serialise the updated history object and write it back to localStorage
    localStorage.setItem('serenimind_moods', JSON.stringify(history));

    // ── Reset UI after saving ──────────────────────────────
    document.querySelectorAll('.mood-emoji').forEach(e => e.classList.remove('selected'));
    selectedMood = null;
    document.getElementById('saveMoodBtn').disabled = true;
    document.getElementById('moodCommentWrap').style.display = 'none';

    // Clear the textarea and reset its character counter
    if (commentEl) { commentEl.value = ''; }
    document.getElementById('moodCommentCount').textContent = '0/120';

    // Show a success confirmation in the selected display area
    document.getElementById('moodSelected').innerHTML =
        `<p style="color:var(--green);">✅ Mood saved!</p>`;

    // Refresh the 7-day grid to include the entry we just saved
    renderMoodWeek();
}

/**
 * renderMoodWeek — builds the 7-day mood history grid and
 * calculates + displays the weekly average score + comment.
 *
 * Algorithm:
 *   1. Iterate i from 6 (6 days ago) down to 0 (today).
 *   2. Compute the date for each i, look up that date in the saved history.
 *   3. Accumulate scores for entries that have one.
 *   4. Inject rendered HTML into the grid container.
 *   5. Display the average or a prompt if no data exists.
 */
function renderMoodWeek() {
    const container  = document.getElementById('moodWeek');
    const avgEl      = document.getElementById('moodAvg');
    const commentEl2 = document.getElementById('moodAvgComment');
    if (!container) return; // element doesn't exist yet — bail early

    const history  = getMoodHistory(); // retrieve all saved entries
    const today    = new Date();
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let html       = '';   // accumulated HTML string for the 7 day-pills
    let scoreTotal = 0;    // sum of mood scores for days that have one
    let scoreCount = 0;    // how many days have a score (for average calc)

    // Build one day-pill per day, starting from 6 days ago up to today
    for (let i = 6; i >= 0; i--) {
        const d       = new Date(today);
        d.setDate(d.getDate() - i);                  // go back i days
        const key     = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
        const isToday = i === 0;                       // highlight today's pill
        const data    = history[key];                  // saved entry or undefined

        // Accumulate score only if this day has a saved mood with a score
        if (data && MOOD_SCORES[data.mood] !== undefined) {
            scoreTotal += MOOD_SCORES[data.mood];
            scoreCount++;
        }

        // If the user wrote a comment, embed it as a data-comment attribute.
        // CSS :hover::after reads this attribute to render a tooltip.
        const commentAttr = (data && data.comment)
            ? `data-comment="${escapeAttr(data.comment)}"`
            : ''; // no attribute if no comment (no tooltip shown)

        // Build the HTML for this day's pill
        html += `
          <div class="mood-day ${isToday ? 'today' : ''}" ${commentAttr}>
            <span class="day-label">${DAY_NAMES[d.getDay()]}</span>
            <span class="day-emoji">${data ? data.emoji : '—'}</span>
            <span class="day-date">${d.getDate()}/${d.getMonth() + 1}</span>
          </div>`;
    }

    // Inject the built HTML all at once (single reflow, more performant)
    container.innerHTML = html;

    // ── Weekly average calculation ─────────────────────────
    if (scoreCount > 0) {
        // Integer average rounded to nearest whole number
        const avg      = Math.round(scoreTotal / scoreCount);

        // Pick an emoji that represents the average score tier
        const avgEmoji = avg >= 80 ? '🤩'
                       : avg >= 65 ? '😊'
                       : avg >= 50 ? '😐'
                       : avg >= 35 ? '😔'
                       : '😰';

        if (avgEl)      avgEl.innerHTML     = `${avgEmoji} <span class="mood-avg-label">${avg}/100 avg</span>`;
        if (commentEl2) commentEl2.textContent = getMoodComment(avg); // motivational message
    } else {
        // No entries yet — show a gentle prompt
        if (avgEl)      avgEl.innerHTML     = '';
        if (commentEl2) commentEl2.textContent = 'Start logging your moods to see your weekly vibe! 🌱';
    }
}

/**
 * getTodayStr — returns the current date as a "YYYY-MM-DD" string.
 * Splitting the ISO string on "T" gives the date part without time.
 * @returns {string}
 */
function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

/**
 * getMoodHistory — reads and parses the mood history from localStorage.
 * Returns an empty object if no data has been saved yet.
 * @returns {Object} date-keyed mood history
 */
function getMoodHistory() {
    return JSON.parse(localStorage.getItem('serenimind_moods')) || {};
}

/**
 * escapeAttr — sanitises a string so it is safe to embed in an HTML
 * data-attribute value. Replaces " and ' which would break the attribute.
 *
 * @param {string} str - raw user-entered string
 * @returns {string} HTML-entity-escaped string
 */
function escapeAttr(str) {
    return str
        .replace(/"/g, '&quot;') // double quote → HTML entity
        .replace(/'/g, '&#39;'); // single quote → HTML entity
}


// ══════════════════════════════════════════════════════════════
// 5. AFFIRMATION GENERATOR
// ══════════════════════════════════════════════════════════════

/**
 * AFFIRMATIONS — curated pool of 30 positive statements written
 * specifically for students dealing with academic stress.
 * Stored as a plain array for simple random-index selection.
 */
const AFFIRMATIONS = [
    "You are capable of handling whatever comes your way.",
    "Your potential is limitless — keep going.",
    "It's okay to take a break. Rest is productive too.",
    "You are enough, just as you are right now.",
    "Progress, not perfection, is what matters.",
    "Every challenge you face is building your strength.",
    "Your feelings are valid and important.",
    "You deserve kindness — especially from yourself.",
    "Small steps still move you forward.",
    "Breathe. You are exactly where you need to be.",
    "Your hard work will pay off — trust the process.",
    "You are stronger than you think.",
    "Today is a new opportunity to grow.",
    "Your mind is powerful. Fill it with good thoughts.",
    "It's okay not to have everything figured out.",
    "You bring something unique to this world.",
    "Be gentle with yourself — you're doing your best.",
    "Difficult roads often lead to beautiful destinations.",
    "You are worthy of love and happiness.",
    "The only person you need to be better than is who you were yesterday.",
    "Mistakes don't define you — they refine you.",
    "You have survived every bad day so far.",
    "Your journey is unique — don't compare it to others.",
    "Take it one step at a time. You'll get there.",
    "Believing in yourself is the first step to success.",
    "You are not alone. It's okay to ask for help.",
    "Your energy is precious — protect it.",
    "Great things take time. Be patient with yourself.",
    "You are a work in progress, and that's beautiful.",
    "Celebrate how far you've come, not just how far you have to go."
];

// Tracks the last shown index so we never immediately repeat it.
// Starts at -1 so any valid index (0–29) can be shown first.
let lastAffirmIndex = -1;

/**
 * newAffirmation — picks a random affirmation that is different from
 * the previous one, animates it into the display, and saves it to
 * localStorage so the same quote reappears on page reload.
 *
 * The do-while loop re-picks if the same index is drawn again.
 * The length > 1 guard prevents infinite loops if only one quote exists.
 */
function newAffirmation() {
    let idx;
    do {
        // Math.random() returns 0.0–0.999..., floor gives 0–(length-1)
        idx = Math.floor(Math.random() * AFFIRMATIONS.length);
    } while (idx === lastAffirmIndex && AFFIRMATIONS.length > 1);

    lastAffirmIndex = idx; // remember this pick for the next call

    const text    = AFFIRMATIONS[idx];
    const quoteEl = document.getElementById('affirmQuote');
    const textEl  = document.getElementById('affirmText');

    // Restart the CSS fade-in animation:
    // 1. Remove the class to stop the current animation
    quoteEl.classList.remove('fade');
    // 2. void offsetWidth forces a browser reflow — without this, removing
    //    and immediately re-adding the class doesn't restart the animation
    void quoteEl.offsetWidth;
    // 3. Re-add the class to play the animation from the beginning
    quoteEl.classList.add('fade');

    // Update the quote text
    textEl.textContent = text;

    // Persist the shown quote to localStorage so it reappears after reload.
    // We also store the index to restore lastAffirmIndex correctly.
    localStorage.setItem('serenimind_lastAffirmation', JSON.stringify({
        text,
        index: idx,
        date:  new Date().toISOString() // timestamp for potential future use
    }));
}

/**
 * loadLastAffirmation — restores the affirmation that was displayed
 * during the user's last visit (read from localStorage).
 * Also restores lastAffirmIndex so the next click won't repeat it.
 */
function loadLastAffirmation() {
    const saved = JSON.parse(localStorage.getItem('serenimind_lastAffirmation'));
    if (saved?.text) {
        document.getElementById('affirmText').textContent = saved.text;
        lastAffirmIndex = saved.index ?? -1; // ?? = nullish coalescing fallback
    }
}


// ══════════════════════════════════════════════════════════════
// 6. INITIALIZATION
// ══════════════════════════════════════════════════════════════

/**
 * DOMContentLoaded fires once the HTML is fully parsed (but before
 * images/stylesheets finish loading). All DOM queries are safe here.
 *
 * Initialisation order:
 *   1. Start the scroll-reveal observer on all .reveal elements
 *   2. Render the Pomodoro timer in its default state
 *   3. Render the 7-day mood history grid
 *   4. If today's mood is already logged, show it
 *   5. Load the last saved affirmation (or generate a fresh one)
 *   6. Run the nav link highlight check for the initial scroll position
 */
document.addEventListener('DOMContentLoaded', () => {

    // 1. Register IntersectionObserver for all .reveal elements
    initScrollReveal();

    // 2. Render timer UI in its initial state (25:00, full ring)
    updateTimerDisplay();
    updateTimerProgress();
    updateTimerLabel();

    // 3. Build the 7-day mood history pills from localStorage data
    renderMoodWeek();

    // 4. If the user has already logged their mood today, show a summary
    //    instead of the blank "Select your mood" placeholder
    const todayData = getMoodHistory()[getTodayStr()];
    if (todayData) {
        document.getElementById('moodSelected').innerHTML =
            `<p>Today you felt <strong>${todayData.label}</strong> ${todayData.emoji}</p>`;
    }

    // 5. Affirmation: reload the last quote or generate a new one on first visit
    const savedAffirm = localStorage.getItem('serenimind_lastAffirmation');
    if (savedAffirm) {
        loadLastAffirmation(); // returning visitor — restore their last quote
    } else {
        newAffirmation();      // first visit — show a quote immediately
    }

    // 6. Synchronise nav link highlight with the current scroll position
    //    (handles the case where the user refreshes mid-page)
    updateActiveNav();
});
