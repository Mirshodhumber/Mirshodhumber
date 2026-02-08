const api = {
  list: (q) => {
  const params = new URLSearchParams();
  if (q?.status) params.set("status", q.status);
  if (q?.docType) params.set("docType", q.docType);
  if (q?.clientRef) params.set("clientRef", q.clientRef);
  const qs = params.toString();
  return fetch(`/api/documents${qs ? "?" + qs : ""}`, { cache: "no-store" })
    .then(r => r.json());
},
  get: (id) => fetch(`/api/documents/${id}`, { cache: "no-store" }).then(r => r.json()),
  create: (payload) => fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(async r => ({ ok: r.ok, status: r.status, data: await r.json() })),
  update: (id, payload) => fetch(`/api/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(async r => ({ ok: r.ok, status: r.status, data: await r.json() })),
  content: (id) => fetch(`/api/documents/${id}/content`).then(async r => ({ ok: r.ok, status: r.status, data: await r.json() })),
  status: (id, payload) => fetch(`/api/documents/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(async r => ({ ok: r.ok, status: r.status, data: await r.json() })),
  remove: (id, payload) => fetch(`/api/documents/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(async r => ({ ok: r.ok, status: r.status, data: await r.json() })),
  exportDaily: () => fetch("/api/exports/daily").then(async r => ({ ok: r.ok, status: r.status, data: await r.json() }))
};

function b64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function showAlert(target, type, message, details) {
  const detailHtml = details ? `<div class="small mt-2">${Array.isArray(details) ? details.join("<br>") : details}</div>` : "";
  const html = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      <div class="fw-semibold">${message}</div>
      ${detailHtml}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
  $(target).html(html);
}

function badge(status) {
  const map = {
    RECEIVED: "secondary",
    VALIDATED: "info",
    QUEUED: "warning",
    PROCESSED: "success",
    REJECTED: "danger"
  };
  const c = map[status] || "secondary";
  return `<span class="badge bg-${c} badge-status">${status}</span>`;
}

function shortId(id) {
  if (!id) return "";
  return id.split("-")[0];
}

function renderRows(docs) {
  $("#countLabel").text(`${docs.length} record(s)`);
  const rows = docs.map(d => `
    <tr>
      <td class="text-muted">${shortId(d.id)}</td>
      <td class="fw-semibold">${escapeHtml(d.clientRef)}</td>
      <td>${escapeHtml(d.docType)}</td>
      <td>${badge(d.status)}</td>
      <td class="text-muted small">${escapeHtml((d.createdAt || "").replace("T", " ").replace("Z",""))}</td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" data-action="content" data-id="${d.id}">Content</button>
          <button class="btn btn-outline-primary" data-action="edit" data-id="${d.id}">Edit</button>
          <button class="btn btn-outline-dark" data-action="status" data-id="${d.id}">Status</button>
          <button class="btn btn-outline-danger" data-action="delete" data-id="${d.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
  $("#docTable").html(rows);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadDocuments() {
  const q = {
    status: $("#filterStatus").val() || null,
    docType: $("#filterType").val() || null,
    clientRef: $("#filterClientRef").val().trim() || null
  };
  const docs = await api.list(q);
  if (docs?.error) {
    showAlert("#alertArea", "danger", "Failed to load documents", docs.error?.message);
    return;
  }
  renderRows(docs);
}

async function openContent(id) {
  const r = await api.content(id);
  if (!r.ok) {
    showAlert("#alertArea", "danger", "Failed to load content", r.data?.error?.details || r.data?.error?.message);
    return;
  }
  $("#contentMeta").text(`ID: ${id} | Content-Type: ${r.data.contentType}`);
  $("#contentPre").text(r.data.content);
  new bootstrap.Modal("#contentModal").show();
}

async function openEdit(id) {
  $("#editAlertArea").empty();
  const doc = await api.get(id);
  if (doc?.error) {
    showAlert("#alertArea", "danger", "Failed to load document", doc.error?.message);
    return;
  }
  $("#editId").val(doc.id);
  $("#editClientRef").val(doc.clientRef);
  $("#editDocType").val(doc.docType);
  $("#editFilename").val(doc.filename);
  $("#editContentType").val(doc.contentType);
  $("#editContent").val("");
  new bootstrap.Modal("#editModal").show();
}

async function saveEdit() {
  $("#editAlertArea").empty();
  const id = $("#editId").val();

  const contentText = $("#editContent").val();
  const payload = {
    clientRef: $("#editClientRef").val().trim(),
    docType: $("#editDocType").val(),
    filename: $("#editFilename").val().trim(),
    contentType: $("#editContentType").val()
  };

  if (contentText.trim().length > 0) {
    payload.contentBase64 = b64(contentText);
  }

  const r = await api.update(id, payload);
  if (!r.ok) {
    showAlert("#editAlertArea", "danger", "Update failed", r.data?.error?.details || r.data?.error?.message);
    return;
  }
  bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
  await loadDocuments();
  showAlert("#alertArea", "success", "Document updated successfully");
}

async function openStatus(id) {
  $("#statusAlertArea").empty();
  $("#statusId").val(id);
  $("#newStatus").val("VALIDATED");
  $("#statusReason").val("");
  new bootstrap.Modal("#statusModal").show();
}

async function saveStatus() {
  $("#statusAlertArea").empty();
  const id = $("#statusId").val();
  const status = $("#newStatus").val();
  const reason = $("#statusReason").val().trim();

  const payload = { status };
  if (reason) payload.reason = reason;

  const r = await api.status(id, payload);
  if (!r.ok) {
    showAlert("#statusAlertArea", "danger", "Status update failed", r.data?.error?.details || r.data?.error?.message);
    return;
  }
  bootstrap.Modal.getInstance(document.getElementById("statusModal")).hide();
  await loadDocuments();
  showAlert("#alertArea", "success", "Status updated successfully");
}

async function openDelete(id) {
  $("#deleteAlertArea").empty();
  $("#deleteId").val(id);
  $("#deleteReason").val("");
  new bootstrap.Modal("#deleteModal").show();
}

async function confirmDelete() {
  $("#deleteAlertArea").empty();
  const id = $("#deleteId").val();
  const reason = $("#deleteReason").val().trim();

  const r = await api.remove(id, { reason });
  if (!r.ok) {
    showAlert("#deleteAlertArea", "danger", "Delete failed", r.data?.error?.details || r.data?.error?.message);
    return;
  }
  bootstrap.Modal.getInstance(document.getElementById("deleteModal")).hide();
  await loadDocuments();
  showAlert("#alertArea", "success", "Document deleted successfully");
}

async function doExport() {
  const r = await api.exportDaily();
  if (!r.ok) {
    showAlert("#alertArea", "danger", "Export failed", r.data?.error?.message);
    return;
  }
  const s = r.data.summary;
  $("#exportInfo").html(`
    <div class="mt-2">
      <div class="fw-semibold">Export created</div>
      <div class="text-muted small">File: ${escapeHtml(r.data.file)}</div>
      <div class="text-muted small">Total: ${s.total}</div>
    </div>
  `);
  showAlert("#alertArea", "success", "Daily export generated");
}

$(document).ready(() => {
  loadDocuments();

  $("#btnRefresh").on("click", loadDocuments);

  $("#btnReset").on("click", () => {
    $("#createForm")[0].reset();
    $("#alertArea").empty();
  });

  $("#btnApplyFilters").on("click", loadDocuments);

  $("#btnClearFilters").on("click", () => {
    $("#filterStatus").val("");
    $("#filterType").val("");
    $("#filterClientRef").val("");
    loadDocuments();
  });

  $("#btnExport").on("click", doExport);

  $("#createForm").on("submit", async (e) => {
    e.preventDefault();
    $("#alertArea").empty();

    const payload = {
      clientRef: $("#clientRef").val().trim(),
      docType: $("#docType").val(),
      filename: $("#filename").val().trim(),
      contentType: $("#contentType").val(),
      contentBase64: b64($("#content").val())
    };

    const r = await api.create(payload);
    if (!r.ok) {
      showAlert("#alertArea", "danger", "Create failed", r.data?.error?.details || r.data?.error?.message);
      return;
    }

    $("#createForm")[0].reset();
    await loadDocuments();
    showAlert("#alertArea", "success", "Document created successfully");
  });

  $("#docTable").on("click", "button[data-action]", async function () {
    const id = $(this).data("id");
    const action = $(this).data("action");

    if (action === "content") return openContent(id);
    if (action === "edit") return openEdit(id);
    if (action === "status") return openStatus(id);
    if (action === "delete") return openDelete(id);
  });

  function generateClientRef() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CLI-${num}`;
}

$(document).ready(() => {
  $("#clientRef").val(generateClientRef());
});


  $("#btnSaveEdit").on("click", saveEdit);
  $("#btnSaveStatus").on("click", saveStatus);
  $("#btnConfirmDelete").on("click", confirmDelete);
});
