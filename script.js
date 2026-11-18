
const FIREBASE_CONFIG = {
  apiKey: "TA_CLE_API_FIREBASE_EXISTANTE",
  authDomain: "calendrier-af9c4.firebaseapp.com",
  projectId: "calendrier-af9c4",
  storageBucket: "calendrier-af9c4.firebasestorage.app",
  messagingSenderId: "TON_SENDER_ID_EXISTANT",
  appId: "TON_APP_ID_EXISTANT"
};

const START_MONTH = "2026-11";

const PEOPLE = [
  { id: "personne1", name: "Yvette & Célestin", color: "#e4572e", hours: "14h-16h" },
  { id: "personne2", name: "Lucia", color: "#2f6fed" },
  { id: "personne3", name: "Edouard & Pina", color: "#16a34a" },
  { id: "personne4", name: "Rose", color: "#c026d3", hours: "13h-16h" },
  { id: "personne5", name: "Mario & Pina", color: "#d97706", hours: "10h30-12h" },
  { id: "personne6", name: "Claude & Jeanou", color: "#0891b2", hours: "10h-17h" },
  { id: "personne7", name: "Dominique", color: "#78350f", hours: "14h-16h" },
  { id: "personne8", name: "Jean-Claude", color: "#475569" },
  { id: "personne9", name: "Steve", color: "#4d7c0f" },
  { id: "personne10", name: "Antoinette", color: "#4338ca" },
  { id: "personne11", name: "Nino", color: "#881337", hours: "14h-17h sauf le mardi (⚠️Contacter Melina avant)" },
  { id: "personne12", name: "Nicole", color: "#ec4899" },
  { id: "personne13", name: "Rosa Fede", color: "#facc15" }
];

let viewDate = new Date(2026, 10, 1);
let visits = {};
let selectedDate = null;
let db = null;
let online = false;

const $ = id => document.getElementById(id);

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthStats(key) {
  const doneIds = new Set();

  Object.values(visits).forEach(visit => {
    if (visit.date && visit.date.startsWith(key)) {
      doneIds.add(visit.personId);
    }
  });

  return {
    done: PEOPLE.filter(person => doneIds.has(person.id)),
    missing: PEOPLE.filter(person => !doneIds.has(person.id))
  };
}

function priorityForPerson(personId) {
  const current = monthKey(viewDate);

  if (current < "2026-12") return false;

  const previousDate = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() - 1,
    1
  );

  const previousMonth = monthKey(previousDate);

  if (previousMonth < START_MONTH) return false;

  return monthStats(previousMonth).missing.some(person => person.id === personId);
}

function renderSummary() {
  const section = $("summary");
  if (!section) return;

  const currentMonth = monthKey(viewDate);

  if (currentMonth <= START_MONTH) {
    section.hidden = true;
    return;
  }

  const previousDate = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() - 1,
    1
  );

  const previousMonth = monthKey(previousDate);
  const stats = monthStats(previousMonth);

  section.hidden = false;

  $("summaryMonth").textContent =
    `Bilan de ${previousDate.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric"
    })}`;

  $("visitedCount").textContent = stats.done.length;
  $("missingCount").textContent = stats.missing.length;

  $("missingList").innerHTML = stats.missing
    .map(person => `<li>${person.name}</li>`)
    .join("");
}

function renderChips() {
  $("chips").innerHTML = PEOPLE.map(person => {
    const warning = priorityForPerson(person.id);

    return `
      <span class="chip ${warning ? "warn" : ""}"
        style="border-color:${person.color}">
        ${warning ? "⚠️ " : ""}${person.name}
      </span>
    `;
  }).join("");
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  $("mlabel").textContent = viewDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = "";

  for (let i = 0; i < offset; i++) {
    html += `<div class="day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);

    const dayVisits = Object.values(visits).filter(
      visit => visit.date === key
    );

    const today = dateKey(new Date()) === key;

    html += `
      <button class="day ${today ? "today" : ""}"
        data-date="${key}">
        <div class="day-number">${day}</div>
        ${dayVisits.map(visit => {
          const person = PEOPLE.find(p => p.id === visit.personId);
          if (!person) return "";

          const warning = priorityForPerson(person.id);

          return `
            <div class="day-person ${warning ? "warn" : ""}"
              style="color:${person.color}">
              ${warning ? "⚠️ " : ""}${person.name}
            </div>
          `;
        }).join("")}
      </button>
    `;
  }

  $("grid").innerHTML = html;

  document.querySelectorAll(".day[data-date]").forEach(button => {
    button.addEventListener("click", () => {
      openSheet(button.dataset.date);
    });
  });
}

function render() {
  renderCalendar();
  renderChips();
  renderSummary();

  $("stat").textContent = `${PEOPLE.length} personnes à visiter`;
}

function openSheet(key) {
  selectedDate = key;

  const date = new Date(key + "T12:00:00");

  $("sdate").textContent = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  $("sheet").hidden = false;

  const existing = Object.values(visits).filter(
    visit => visit.date === key
  );

  $("pbs").innerHTML = PEOPLE.map(person => {
    const selected = existing.some(v => v.personId === person.id);

    return `
      <button class="${selected ? "selected" : ""}"
        data-person="${person.id}">
        <span style="color:${person.color}">●</span>
        ${person.name}
        ${person.hours ? `<small> — ${person.hours}</small>` : ""}
        ${selected ? " ✓" : ""}
      </button>
    `;
  }).join("");

  document.querySelectorAll("#pbs button").forEach(button => {
    button.addEventListener("click", () => {
      toggleVisit(button.dataset.person);
    });
  });
}

function closeSheet() {
  $("sheet").hidden = true;
}

async function toggleVisit(personId) {
  if (!selectedDate) return;

  const id = `${selectedDate}_${personId}`;
  const existing = visits[id];

  if (existing) {
    if (online) {
      await db.collection("visits").doc(id).delete();
    } else {
      delete visits[id];
      localStorage.setItem("visits", JSON.stringify(visits));
      render();
    }
  } else {
    const visit = {
      date: selectedDate,
      personId,
      uid: window.currentUid || "local",
      by: "calendar"
    };

    if (online) {
      await db.collection("visits").doc(id).set(visit);
    } else {
      visits[id] = visit;
      localStorage.setItem("visits", JSON.stringify(visits));
      render();
    }
  }

  if (!online) openSheet(selectedDate);
}

$("prev").addEventListener("click", () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  render();
});

$("next").addEventListener("click", () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  render();
});

$("sclose").addEventListener("click", closeSheet);

$("sheet").addEventListener("click", event => {
  if (event.target === $("sheet")) closeSheet();
});

// Mode local si Firebase n'est pas disponible
function useLocalMode() {
  try {
    visits = JSON.parse(localStorage.getItem("visits") || "{}");
  } catch {
    visits = {};
  }

  $("banner").textContent =
    "Mode local : les visites sont enregistrées sur cet appareil.";

  render();
}

// Connexion Firebase
function initFirebase() {
  if (
    !FIREBASE_CONFIG.apiKey ||
    FIREBASE_CONFIG.apiKey.startsWith("TA_CLE")
  ) {
    useLocalMode();
    return;
  }

  if (!window.firebase) {
    useLocalMode();
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    db = firebase.firestore();

    firebase.auth().signInAnonymously()
      .then(userCredential => {
        window.currentUid = userCredential.user.uid;
        online = true;

        $("banner").textContent =
          "Calendrier synchronisé avec Firebase.";

        db.collection("visits").onSnapshot(snapshot => {
          visits = {};

          snapshot.forEach(doc => {
            visits[doc.id] = doc.data();
          });

          render();

          if (!$("sheet").hidden && selectedDate) {
            openSheet(selectedDate);
          }
        }, error => {
          console.error(error);
          $("banner").textContent =
            "Erreur de synchronisation Firebase.";
        });
      })
      .catch(error => {
        console.error(error);
        useLocalMode();
      });
  } catch (error) {
    console.error(error);
    useLocalMode();
  }
}

render();
initFirebase();
