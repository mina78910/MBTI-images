(function () {
  "use strict";

  var toggle = document.getElementById("imageOnlyToggle");

  function updateView() {
    document.body.classList.toggle("image-only-view", toggle.checked);
  }

  toggle.addEventListener("change", updateView);
  updateView();
}());
