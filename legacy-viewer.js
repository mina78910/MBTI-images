(function () {
  "use strict";

  var API_KEY = "AIzaSyDwIdnlDMOsu_dVvyDluC7TI-aa_dK6SFs";
  var PROJECT_ID = "mbti-materials";
  var materials = [];
  var gallery = document.getElementById("gallery");
  var searchInput = document.getElementById("searchInput");
  var excludeSearchInput = document.getElementById("excludeSearchInput");
  var sizeRange = document.getElementById("sizeRange");
  var sortSelect = document.getElementById("sortSelect");
  var operationStatus = document.getElementById("operationStatus");
  var tagPickerButton = document.getElementById("tagPickerButton");
  var tagPickerPanel = document.getElementById("tagPickerPanel");
  var tagPickerClose = document.getElementById("tagPickerClose");
  var tagPickerFilter = document.getElementById("tagPickerFilter");
  var tagPickerOptions = document.getElementById("tagPickerOptions");

  function escapeHtml(value) {
    var entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return entities[character];
    });
  }

  function queryValue(name) {
    var parts = window.location.search.replace(/^\?/, "").split("&");
    var index;
    var pair;
    for (index = 0; index < parts.length; index += 1) {
      pair = parts[index].split("=");
      if (decodeURIComponent(pair[0] || "") === name) {
        return decodeURIComponent((pair.slice(1).join("=") || "").replace(/\+/g, " "));
      }
    }
    return "";
  }

  function firestoreValue(value) {
    var result;
    var key;
    var values;
    var index;
    if (!value) return null;
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.integerValue !== undefined) return Number(value.integerValue);
    if (value.doubleValue !== undefined) return Number(value.doubleValue);
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.timestampValue !== undefined) return value.timestampValue;
    if (value.nullValue !== undefined) return null;
    if (value.arrayValue !== undefined) {
      result = [];
      values = value.arrayValue.values || [];
      for (index = 0; index < values.length; index += 1) result.push(firestoreValue(values[index]));
      return result;
    }
    if (value.mapValue !== undefined) {
      result = {};
      values = value.mapValue.fields || {};
      for (key in values) {
        if (Object.prototype.hasOwnProperty.call(values, key)) result[key] = firestoreValue(values[key]);
      }
      return result;
    }
    return null;
  }

  function documentToMaterial(documentValue) {
    var item = {};
    var fields = documentValue.fields || {};
    var key;
    for (key in fields) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) item[key] = firestoreValue(fields[key]);
    }
    item.id = (documentValue.name || "").split("/").pop();
    return item;
  }

  function splitTerms(value) {
    var raw = String(value || "").toLowerCase().split(/[\s,、，]+/);
    var terms = [];
    var index;
    for (index = 0; index < raw.length; index += 1) if (raw[index]) terms.push(raw[index]);
    return terms;
  }

  function matches(item) {
    var tags = item.tags instanceof Array ? item.tags : [];
    var include = splitTerms(searchInput.value);
    var exclude = splitTerms(excludeSearchInput.value);
    var normalized = [];
    var index;
    var termIndex;
    var found;
    for (index = 0; index < tags.length; index += 1) normalized.push(String(tags[index]).toLowerCase());
    if (include.length) {
      found = false;
      for (termIndex = 0; termIndex < include.length && !found; termIndex += 1) {
        for (index = 0; index < normalized.length; index += 1) {
          if (normalized[index].indexOf(include[termIndex]) !== -1) { found = true; break; }
        }
      }
      if (!found) return false;
    }
    for (termIndex = 0; termIndex < exclude.length; termIndex += 1) {
      for (index = 0; index < normalized.length; index += 1) {
        if (normalized[index].indexOf(exclude[termIndex]) !== -1) return false;
      }
    }
    return true;
  }

  function timestamp(item) {
    var value = item.createdAt;
    var parsed = typeof value === "string" ? Date.parse(value) : 0;
    return isNaN(parsed) ? 0 : parsed;
  }

  function sortedMaterials() {
    return materials.slice().sort(function (left, right) {
      var titleResult;
      if (sortSelect.value === "custom") {
        if (Number(left.sortOrder) !== Number(right.sortOrder)) return Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
      }
      if (timestamp(left) !== timestamp(right)) return timestamp(left) - timestamp(right);
      titleResult = String(left.title || left.originalFileName || "").localeCompare(String(right.title || right.originalFileName || ""));
      return titleResult;
    });
  }

  function renderGallery() {
    var sorted = sortedMaterials();
    var html = [];
    var index;
    var tagIndex;
    var item;
    var tags;
    var title;
    for (index = 0; index < sorted.length; index += 1) {
      item = sorted[index];
      if (!matches(item)) continue;
      title = escapeHtml(item.title || item.originalFileName || "無題の画像");
      tags = [];
      if (item.tags instanceof Array) {
        for (tagIndex = 0; tagIndex < item.tags.length; tagIndex += 1) tags.push('<span class="tag-chip">' + escapeHtml(item.tags[tagIndex]) + "</span>");
      }
      html.push('<article class="viewer-card"><button class="image-button" type="button" aria-label="' + title + 'を表示"><div class="image-wrap"><img src="' + escapeHtml(item.imageUrl) + '" alt="' + title + '"></div></button><div class="card-details"><div class="tag-list">' + (tags.join("") || '<span class="upload-note">タグなし</span>') + "</div></div></article>");
    }
    gallery.innerHTML = html.length ? html.join("") : '<p class="empty-message">条件に一致する画像がありません。</p>';
    renderTags();
  }

  function uniqueTags() {
    var seen = {};
    var tags = [];
    var index;
    var tagIndex;
    var value;
    var key;
    for (index = 0; index < materials.length; index += 1) {
      if (!(materials[index].tags instanceof Array)) continue;
      for (tagIndex = 0; tagIndex < materials[index].tags.length; tagIndex += 1) {
        value = String(materials[index].tags[tagIndex] || "");
        key = value.toLowerCase();
        if (value && !seen[key]) { seen[key] = true; tags.push(value); }
      }
    }
    return tags.sort();
  }

  function renderTags() {
    var tags = uniqueTags();
    var filter = String(tagPickerFilter.value || "").toLowerCase();
    var html = [];
    var index;
    tagPickerButton.innerHTML = tags.length ? "全タグから選ぶ（" + tags.length + "件）" : "全タグから選ぶ";
    for (index = 0; index < tags.length; index += 1) {
      if (!filter || tags[index].toLowerCase().indexOf(filter) !== -1) html.push('<button class="tag-option-button" type="button" data-tag="' + escapeHtml(tags[index]) + '">' + escapeHtml(tags[index]) + "</button>");
    }
    tagPickerOptions.innerHTML = html.join("");
  }

  function showError(message) {
    operationStatus.hidden = false;
    operationStatus.className = "status-message status-message--error";
    operationStatus.innerHTML = '<div class="status-content"><strong class="status-title">一覧を取得できませんでした</strong><p class="status-detail">' + escapeHtml(message) + "</p></div>";
  }

  function loadPage(pageToken) {
    var request = new XMLHttpRequest();
    var url = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents/materials?pageSize=100&key=" + encodeURIComponent(API_KEY);
    if (pageToken) url += "&pageToken=" + encodeURIComponent(pageToken);
    request.open("GET", url, true);
    request.onreadystatechange = function () {
      var response;
      var documents;
      var index;
      if (request.readyState !== 4) return;
      if (request.status < 200 || request.status >= 300) {
        showError("Firestoreへの接続に失敗しました（HTTP " + request.status + "）。");
        return;
      }
      try { response = JSON.parse(request.responseText); } catch (error) { showError("Firestoreの応答を読み取れませんでした。"); return; }
      documents = response.documents || [];
      for (index = 0; index < documents.length; index += 1) materials.push(documentToMaterial(documents[index]));
      if (response.nextPageToken) loadPage(response.nextPageToken);
      else {
        sortSelect.value = "createdAt";
        for (index = 0; index < materials.length; index += 1) if (typeof materials[index].sortOrder === "number") { sortSelect.value = "custom"; break; }
        renderGallery();
      }
    };
    request.send(null);
  }

  function applySize() {
    var cards = gallery.getElementsByClassName("viewer-card");
    var size = Math.max(160, Math.min(1180, Number(sizeRange.value)));
    var index;
    for (index = 0; index < cards.length; index += 1) cards[index].style.flexBasis = size + "px";
  }

  document.getElementById("loginButton").style.display = "none";
  document.getElementById("logoutButton").style.display = "none";
  document.getElementById("saveOrderButton").style.display = "none";
  document.getElementById("authStatus").innerHTML = "互換表示（閲覧専用）";
  searchInput.value = queryValue("tag") || queryValue("tags");
  excludeSearchInput.value = queryValue("exclude") || queryValue("excludeTags");
  searchInput.addEventListener("input", renderGallery, false);
  excludeSearchInput.addEventListener("input", renderGallery, false);
  sortSelect.addEventListener("change", renderGallery, false);
  sizeRange.addEventListener("input", function () { applySize(); }, false);
  gallery.addEventListener("click", function (event) {
    var target = event.target;
    while (target && target !== gallery && String(target.className).indexOf("image-button") === -1) target = target.parentNode;
    if (target && target !== gallery) { sizeRange.value = sizeRange.max; applySize(); target.parentNode.scrollIntoView(true); }
  }, false);
  tagPickerButton.addEventListener("click", function () { tagPickerPanel.hidden = false; renderTags(); }, false);
  tagPickerClose.addEventListener("click", function () { tagPickerPanel.hidden = true; }, false);
  tagPickerFilter.addEventListener("input", renderTags, false);
  tagPickerOptions.addEventListener("click", function (event) {
    var target = event.target;
    if (!target.getAttribute("data-tag")) return;
    searchInput.value = searchInput.value ? searchInput.value + " " + target.getAttribute("data-tag") : target.getAttribute("data-tag");
    tagPickerPanel.hidden = true;
    renderGallery();
  }, false);

  gallery.innerHTML = '<p class="empty-message">画像を読み込んでいます…</p>';
  loadPage("");
}());
