"use strict";

function clanToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderClan() {
  const summary = T.clanSummary(state.clanBoss, clanToday(), Number($("clan-period").value), $("clan-difficulty").value);
  const format = number => number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const metrics = Object.entries(T.clanRewards).map(([key, label]) => {
    const total = summary.totals[key];
    const average = summary.averages[key];
    return `<div class="clan-metric"><span>${label}</span><strong>${format(total)}</strong><small>${average === null ? "No recorded days" : `${format(average.day)} / day · ${format(average.week)} / 7 days · ${format(average.month)} / 30 days`}</small></div>`;
  }).join("");
  const incomplete = summary.partialDays ? ` · ${summary.partialDays} incomplete ${summary.partialDays === 1 ? "day" : "days"} included` : "";
  $("clan-summary").innerHTML = `<p class="clan-count">${summary.recordedDays} recorded ${summary.recordedDays === 1 ? "day" : "days"} · ${summary.chests} chests${incomplete}</p><div class="clan-metrics">${metrics}</div>`;
  const records = [...state.clanBoss].sort((a, b) => b.date.localeCompare(a.date));
  $("clan-history").innerHTML = records.length ? records.map(record => {
    const rows = Object.entries(record.difficulties);
    const partial = rows.length !== 4 || rows.some(([, row]) => row.chests !== 2);
    const details = rows.map(([key, row]) => `${T.clanDifficulties[key]} (${row.chests} ${row.chests === 1 ? "chest" : "chests"}): ${row.books} books, ${row.sacred} sacred, ${row.void} void, ${row.ancient} ancient`).join(" · ");
    return `<div class="clan-history-row"><div><strong>${record.date}${partial ? " · Incomplete" : ""}</strong><p>${details}</p></div><div class="clan-history-actions"><button type="button" class="button button-quiet" data-clan-edit="${record.date}">Edit</button><button type="button" class="button button-quiet" data-clan-delete="${record.date}">Delete</button></div></div>`;
  }).join("") : '<p class="section-copy">No reward days recorded yet.</p>';
}

function populateClanForm() {
  const date = $("clan-date").value;
  const record = state.clanBoss.find(item => item.date === date);
  $("clan-form-note").textContent = record
    ? "Editing the saved entry for this date. Unchecked difficulties remain unrecorded."
    : "Two chests per difficulty are preselected; check your actual rewards before saving.";
  $("clan-form-error").textContent = "";
  $("clan-rows").innerHTML = Object.entries(T.clanDifficulties).map(([key, name]) => {
    const row = record ? record.difficulties[key] : { chests: 2, books: 0, sacred: 0, void: 0, ancient: 0 };
    const fields = ["chests", ...Object.keys(T.clanRewards)].map(field => {
      const label = field === "chests" ? "chests" : T.clanRewards[field];
      return `<td><input type="number" data-clan-field="${field}" aria-label="${name} ${label}" min="${field === "chests" ? 1 : 0}" max="${field === "chests" ? 2 : 1000}" step="1" value="${row ? row[field] : field === "chests" ? 2 : 0}" required${row ? "" : " disabled"}></td>`;
    }).join("");
    return `<tr data-clan-row="${key}"><td><input type="checkbox" data-clan-include aria-label="Record ${name}"${row ? " checked" : ""}></td><th scope="row">${name}</th>${fields}</tr>`;
  }).join("");
}

function openClanForm(date) {
  $("clan-date").max = clanToday();
  $("clan-date").value = date;
  populateClanForm();
  $("clan-dialog").showModal();
}

function initClan() {
$("clan-new").addEventListener("click", () => openClanForm(clanToday()));
$("clan-close").addEventListener("click", () => $("clan-dialog").close());
$("clan-cancel").addEventListener("click", () => $("clan-dialog").close());
$("clan-date").addEventListener("change", populateClanForm);
for (const id of ["clan-period", "clan-difficulty"]) $(id).addEventListener("change", renderClan);
$("clan-rows").addEventListener("change", event => {
  if (!event.target.matches("[data-clan-include]")) return;
  for (const input of event.target.closest("tr").querySelectorAll("[data-clan-field]")) input.disabled = !event.target.checked;
});
$("clan-form").addEventListener("submit", event => {
  event.preventDefault();
  try {
    const date = $("clan-date").value;
    if (date > clanToday()) throw new Error("The reward date cannot be in the future.");
    const difficulties = {};
    for (const row of $("clan-rows").querySelectorAll("[data-clan-row]")) {
      if (!row.querySelector("[data-clan-include]").checked) continue;
      difficulties[row.dataset.clanRow] = Object.fromEntries([...row.querySelectorAll("[data-clan-field]")].map(input => [input.dataset.clanField, Number(input.value)]));
    }
    const record = T.validateClanRecord({ date, difficulties });
    const clanBoss = state.clanBoss.filter(item => item.date !== date);
    clanBoss.push(record);
    if (save({ ...state, clanBoss }, "Demon Lord rewards saved.")) $("clan-dialog").close();
    else $("clan-form-error").textContent = "Could not save your rewards. Check the storage error in the header after closing this dialog.";
  } catch (error) {
    $("clan-form-error").textContent = error.message;
  }
});
$("clan-history").addEventListener("click", event => {
  const edit = event.target.closest("[data-clan-edit]");
  const remove = event.target.closest("[data-clan-delete]");
  if (edit) openClanForm(edit.dataset.clanEdit);
  if (remove && window.confirm(`Delete all recorded Demon Lord rewards for ${remove.dataset.clanDelete}?`)) {
    save({ ...state, clanBoss: state.clanBoss.filter(record => record.date !== remove.dataset.clanDelete) }, "Reward day deleted.");
  }
});
}
