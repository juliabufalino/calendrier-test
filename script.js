
let summaryMonth = null;
let showHistory = false;

function monthKey(y, m) {
  return y + "-" + pad(m + 1);
}

function monthLabel(k) {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-BE", {
    month: "long",
    year: "numeric"
  });
}

function monthStats(k) {
  const prefix = k + "-";
  const done = PEOPLE.filter(p =>
    visits.some(v => v.date && v.date.startsWith(prefix) && v.personId === p.id)
  );
  return {
    done,
    missing: PEOPLE.filter(p => !done.some(v => v.id === p.id))
  };
}

function previousMonthKey(y, m) {
  const d = new Date(y, m - 1, 1);
  return monthKey(d.getFullYear(), d.getMonth());
}

function renderMonthlySummary(y, m) {
  let panel = $("monthlySummary");

  if (!panel) {
    panel = el("div");
    panel.id = "monthlySummary";
    $("grid").before(panel);
  }

  panel.replaceChildren();

  const defaultKey = previousMonthKey(y, m);
  const target = summaryMonth || defaultKey;
  const stats = monthStats(target);

  panel.style.cssText =
    "padding:14px;margin:12px 0;border:1px solid var(--line);" +
    "border-radius:14px;background:var(--bg);";

  const heading = el("h3", null, "📊 Bilan de " + monthLabel(target));
  panel.append(heading);

  panel.append(el("p", null,
    stats.done.length + " sur " + PEOPLE.length +
    " personnes visitées."
  ));

  panel.append(el("p", null,
    "⚠️ " + stats.missing.length + " personne" +
    (stats.missing.length > 1 ? "s" : "") + " non visitée" +
    (stats.missing.length > 1 ? "s" : "")
  ));

  if (stats.missing.length) {
    const list = el("div");
    stats.missing.forEach(p => {
      const line = el("div", null, "⚠️ " + p.name);
      line.style.color = p.color;
      line.style.fontWeight = "bold";
      line.style.margin = "5px 0";
      list.append(line);
    });
    panel.append(list);
  } else {
    panel.append(el("p", null, "✓ Toutes les personnes ont été visitées !"));
  }

  const historyButton = el("button", null,
    showHistory ? "Masquer les anciens bilans" : "Voir les bilans précédents"
  );
  historyButton.onclick = () => {
    showHistory = !showHistory;
    renderMonthlySummary(y, m);
  };
  panel.append(historyButton);

  if (showHistory) {
    const history = el("div");
    history.style.marginTop = "12px";

    const earliest = visits
      .filter(v => v.date)
      .map(v => v.date.slice(0, 7))
      .sort()[0];

    if (earliest) {
      const [ey, em] = earliest.split("-").map(Number);
      const end = new Date(y, m - 1, 1);

      for (let d = new Date(ey, em - 1, 1);
           d <= end;
           d.setMonth(d.getMonth() + 1)) {
        const k = monthKey(d.getFullYear(), d.getMonth());
        if (k >= monthKey(y, m)) continue;

        const s = monthStats(k);
        const b = el("button", null,
          monthLabel(k) + " — " + s.done.length + "/" + PEOPLE.length
        );
        b.style.display = "block";
        b.style.margin = "6px 0";
        b.onclick = () => {
          summaryMonth = k;
          renderMonthlySummary(y, m);
        };
        history.append(b);
      }
    } else {
      history.append(el("p", null, "Aucun historique disponible."));
    }

    panel.append(history);
  }
}
