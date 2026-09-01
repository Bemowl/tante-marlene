(() => {
  const $ = s => document.querySelector(s);
  const els = {
    inventory: $("#inventory"), search: $("#search"), chips: $("#categoryChips"),
    articleCount: $("#articleCount"), unitCount: $("#unitCount"), reviewCount: $("#reviewCount"), lastCount: $("#lastCount"),
    save: $("#saveCountBtn"), changeHint: $("#changeHint"), toast: $("#toast"),
    tools: $("#toolsDialog"), itemDialog: $("#itemDialog"), historyDialog: $("#historyDialog"),
    itemForm: $("#itemForm"), historyList: $("#historyList"), importInput: $("#importInput")
  };

  let items = [];
  let originalQuantities = new Map();
  let activeCategory = "Todas";
  let deferredInstallPrompt = null;

  const fmt = new Intl.DateTimeFormat("es-CL", { dateStyle:"medium", timeStyle:"short" });
  const formatDate = iso => { try { return fmt.format(new Date(iso)); } catch { return iso || "—"; } };

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  function categories() {
    const known = [...TM_SEED.categories];
    for (const i of items) if (!known.includes(i.category)) known.push(i.category);
    return known;
  }

  function dirtyCount() { return items.filter(i => originalQuantities.get(i.id) !== Number(i.quantity)).length; }

  function updateSaveState() {
    const n = dirtyCount();
    els.changeHint.textContent = n ? `${n} ${n === 1 ? "cambio pendiente" : "cambios pendientes"}` : "Sin cambios pendientes";
    els.save.disabled = false;
  }

  function updateSummary() {
    const active = items.filter(i => i.active !== false);
    els.articleCount.textContent = active.length;
    els.unitCount.textContent = active.reduce((sum,i) => sum + (Number(i.quantity) || 0), 0);
    els.reviewCount.textContent = active.filter(i => i.needsReview).length;
  }

  function renderChips() {
    const all = ["Todas", ...categories()];
    els.chips.innerHTML = all.map(c => `<button class="chip ${c===activeCategory?"active":""}" data-category="${esc(c)}">${esc(c)}</button>`).join("");
    els.chips.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => { activeCategory = b.dataset.category; renderChips(); renderInventory(); }));
  }

  function esc(s="") { return String(s).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }

  function itemCard(item) {
    const prev = originalQuantities.get(item.id);
    const changed = Number(item.quantity) !== Number(prev);
    const low = item.minStock !== null && item.minStock !== "" && Number(item.quantity) <= Number(item.minStock);
    return `<article class="item-card" data-id="${esc(item.id)}"><div class="item-top"><div><div class="item-name">${esc(item.name)}</div><div class="item-meta"><span>${esc(item.subcategory || item.category)}</span>${item.needsReview ? '<span class="badge review">Por revisar</span>' : ''}${low ? '<span class="badge low">Stock bajo</span>' : ''}</div></div><button class="edit-btn" data-edit="${esc(item.id)}">Editar</button></div><div class="stepper"><button data-delta="-1" aria-label="Restar una unidad">−</button><input class="qty-input ${changed?"changed":""}" data-qty="${esc(item.id)}" type="number" min="0" step="1" inputmode="numeric" value="${Number(item.quantity)||0}" aria-label="Cantidad de ${esc(item.name)}" /><button data-delta="1" aria-label="Sumar una unidad">＋</button></div></article>`;
  }

  function renderInventory() {
    const q = els.search.value.trim().toLocaleLowerCase("es");
    const filtered = items.filter(i => i.active !== false).filter(i => activeCategory === "Todas" || i.category === activeCategory).filter(i => !q || `${i.name} ${i.category} ${i.subcategory} ${i.notes}`.toLocaleLowerCase("es").includes(q));
    if (!filtered.length) { els.inventory.innerHTML = '<div class="empty">No encontré artículos con ese filtro.</div>'; return; }
    const grouped = new Map();
    for (const i of filtered) { if (!grouped.has(i.category)) grouped.set(i.category, []); grouped.get(i.category).push(i); }
    els.inventory.innerHTML = [...grouped.entries()].map(([cat, group]) => `<section class="category"><div class="category-head"><h2>${esc(cat)}</h2><span>${group.length} artículos</span></div>${group.sort((a,b)=>a.name.localeCompare(b.name,"es")).map(itemCard).join("")}</section>`).join("");
    els.inventory.querySelectorAll("[data-delta]").forEach(btn => btn.addEventListener("click", () => { const card = btn.closest(".item-card"); const input = card.querySelector("[data-qty]"); setQuantity(input.dataset.qty, Math.max(0, Number(input.value || 0) + Number(btn.dataset.delta))); }));
    els.inventory.querySelectorAll("[data-qty]").forEach(input => { input.addEventListener("change", () => setQuantity(input.dataset.qty, Math.max(0, Number(input.value || 0)))); input.addEventListener("focus", () => input.select()); });
    els.inventory.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => openItem(btn.dataset.edit)));
  }

  function setQuantity(id, value) { const item = items.find(x => x.id === id); if (!item) return; item.quantity = Math.floor(value); updateSummary(); updateSaveState(); renderInventory(); }

  async function refresh() {
    items = await TMDB.getItems();
    items.sort((a,b) => categories().indexOf(a.category)-categories().indexOf(b.category) || a.name.localeCompare(b.name,"es"));
    originalQuantities = new Map(items.map(i => [i.id, Number(i.quantity)]));
    const sessions = await TMDB.getSessions();
    els.lastCount.textContent = sessions[0] ? formatDate(sessions[0].date) : "Sin conteos";
    updateSummary(); updateSaveState(); renderChips(); renderInventory();
  }

  async function saveCount() {
    els.save.disabled = true; els.save.textContent = "Guardando…";
    try { const session = await TMDB.saveCount(items); originalQuantities = new Map(items.map(i => [i.id, Number(i.quantity)])); els.lastCount.textContent = formatDate(session.date); updateSaveState(); renderInventory(); toast("Conteo guardado"); }
    catch (e) { console.error(e); toast("No se pudo guardar"); }
    finally { els.save.disabled = false; els.save.textContent = "Guardar conteo"; }
  }

  function fillCategorySelect() { $("#itemCategory").innerHTML = categories().map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join(""); }

  function openItem(id=null) {
    fillCategorySelect(); const item = id ? items.find(x=>x.id===id) : null;
    $("#itemDialogTitle").textContent = item ? "Editar artículo" : "Añadir artículo"; $("#itemId").value = item?.id || ""; $("#itemName").value = item?.name || ""; $("#itemCategory").value = item?.category || categories()[0]; $("#itemSubcategory").value = item?.subcategory || ""; $("#itemQty").value = item?.quantity ?? 0; $("#itemMin").value = item?.minStock ?? ""; $("#itemLocation").value = item?.location || ""; $("#itemNotes").value = item?.notes || ""; $("#itemReview").checked = !!item?.needsReview; $("#deleteItemBtn").hidden = !item;
    if (els.tools.open) els.tools.close(); els.itemDialog.showModal();
  }

  function makeId(category) {
    const prefix = category === "Loza" ? "LOZ" : category === "Cubiertos" ? "CUB" : category === "Vasos de cerveza" ? "VAS" : category === "Vasos / jugos" ? "BEB" : category === "Copas" ? "COP" : "OTR";
    const nums = items.filter(i=>i.id.startsWith(`TM-${prefix}-`)).map(i=>Number(i.id.split("-").pop())).filter(Number.isFinite);
    return `TM-${prefix}-${String((Math.max(0,...nums)+1)).padStart(3,"0")}`;
  }

  async function saveItemFromForm(e) {
    e.preventDefault(); const existing = items.find(x=>x.id===$("#itemId").value); const category = $("#itemCategory").value;
    const item = { ...(existing || {}), id: existing?.id || makeId(category), name: $("#itemName").value.trim(), category, subcategory: $("#itemSubcategory").value.trim(), quantity: Math.max(0, Number($("#itemQty").value || 0)), minStock: $("#itemMin").value === "" ? null : Math.max(0, Number($("#itemMin").value)), location: $("#itemLocation").value.trim(), notes: $("#itemNotes").value.trim(), needsReview: $("#itemReview").checked, active:true };
    await TMDB.putItem(item); els.itemDialog.close(); await refresh(); toast(existing ? "Artículo actualizado" : "Artículo añadido");
  }

  async function removeItem() { const id = $("#itemId").value; if (!id || !confirm("¿Eliminar este artículo del inventario actual? El historial anterior se conserva.")) return; await TMDB.deleteItem(id); els.itemDialog.close(); await refresh(); toast("Artículo eliminado"); }

  async function showHistory() {
    if (els.tools.open) els.tools.close(); const sessions = await TMDB.getSessions(); const itemMap = new Map(items.map(i=>[i.id,i])); const blocks = [];
    for (const s of sessions.slice(0,25)) { const entries = await TMDB.getEntriesForSession(s.id); const total = entries.reduce((a,e)=>a+Number(e.quantity||0),0); blocks.push(`<details class="history-session"><summary><strong>${esc(s.label || "Conteo")}</strong><p>${formatDate(s.date)} · ${entries.length} artículos · ${total} unidades</p></summary><div class="history-detail">${entries.slice().sort((a,b)=>(itemMap.get(a.itemId)?.name||a.itemId).localeCompare(itemMap.get(b.itemId)?.name||b.itemId,"es")).map(e=>`${esc(itemMap.get(e.itemId)?.name || e.itemId)}: <strong>${e.quantity}</strong>`).join("<br>")}</div></details>`); }
    els.historyList.innerHTML = blocks.join("") || '<div class="empty">Aún no hay historial.</div>'; els.historyDialog.showModal();
  }

  async function exportBackup() { const data = await TMDB.exportData(); const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `tante-marlene-respaldo-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast("Respaldo exportado"); }

  async function importBackup(file) {
    if (!file) return;
    try { const data = JSON.parse(await file.text()); if (!confirm("Esto reemplazará los datos actuales de esta instalación. ¿Continuar?")) return; await TMDB.importData(data); await refresh(); if (els.tools.open) els.tools.close(); toast("Respaldo importado"); }
    catch(e) { console.error(e); toast("Archivo de respaldo no válido"); }
    finally { els.importInput.value = ""; }
  }

  function registerSW() { if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(console.error); }

  function bind() {
    $("#menuBtn").addEventListener("click",()=>els.tools.showModal()); $("#historyBtn").addEventListener("click",showHistory); $("#addItemBtn").addEventListener("click",()=>openItem()); $("#exportBtn").addEventListener("click",exportBackup); els.importInput.addEventListener("change",()=>importBackup(els.importInput.files[0])); els.search.addEventListener("input",renderInventory); els.save.addEventListener("click",saveCount); els.itemForm.addEventListener("submit",saveItemFromForm); $("#closeItemBtn").addEventListener("click",()=>els.itemDialog.close()); $("#deleteItemBtn").addEventListener("click",removeItem); $("#closeHistoryBtn").addEventListener("click",()=>els.historyDialog.close());
    window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstallPrompt=e; const b=$("#installBtn"); b.hidden=false; b.onclick=async()=>{ if (els.tools.open) els.tools.close(); deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; b.hidden=true; }; });
  }

  async function init() { bind(); await TMDB.seedIfNeeded(TM_SEED); await refresh(); registerSW(); }
  init().catch(e => { console.error(e); toast("Error al iniciar la app"); });
})();
