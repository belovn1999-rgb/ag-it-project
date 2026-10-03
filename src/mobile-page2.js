// Page 2 "Analiza" — design audit of 03.10.2026 (docs/PROJECT-MOBILE.md),
// item 18: no chart label sits on another. After every drawing of the
// analysis (and on every resize) the labels are measured:
//  - right edge: P75 / Mediana / P25 and the other markets' medians are
//    moved apart vertically, as little as needed, inside the chart;
//  - left edge: a price step that touches the cheapest / dearest price label
//    is hidden;
//  - bottom: axis steps that touch a neighbour are hidden (the first and the
//    last always stay).
// Only reads and nudges mobile-market-analysis.js's DOM; page 3 is not touched.
(() => {
  const view = document.querySelector("[data-mobile-market-analysis-view]");
  const content = document.querySelector("[data-mobile-market-analysis-content]");
  if (!view || !content) return;

  const GAP = 2;
  const shown = (element) => element.getBoundingClientRect().width > 0 && getComputedStyle(element).display !== "none";
  const overlaps = (left, right, pad = 0) => {
    const a = left.getBoundingClientRect();
    const b = right.getBoundingClientRect();
    return !(a.right + pad <= b.left || b.right + pad <= a.left || a.bottom + pad <= b.top || b.bottom + pad <= a.top);
  };

  // Right edge: keep the labels' order, push each one just clear of the one
  // above it, then pull the column back up if it ran past the chart's bottom.
  const spreadRightLabels = (scale) => {
    const labels = [...scale.querySelectorAll(".mobileMarketKeyTick")].filter(shown);
    labels.forEach((label) => { label.style.marginTop = ""; });
    if (labels.length < 2) return;
    const box = scale.getBoundingClientRect();
    const items = labels.map((label) => {
      const rect = label.getBoundingClientRect();
      return { label, centre: rect.top + rect.height / 2, height: rect.height };
    }).sort((left, right) => left.centre - right.centre);
    const placed = items.map((item) => item.centre);
    for (let index = 1; index < items.length; index += 1) {
      const minimum = placed[index - 1] + (items[index - 1].height + items[index].height) / 2 + GAP;
      if (placed[index] < minimum) placed[index] = minimum;
    }
    const last = items.length - 1;
    const bottom = box.bottom - items[last].height / 2 - GAP;
    if (placed[last] > bottom) {
      placed[last] = bottom;
      for (let index = last - 1; index >= 0; index -= 1) {
        const maximum = placed[index + 1] - (items[index].height + items[index + 1].height) / 2 - GAP;
        if (placed[index] > maximum) placed[index] = maximum;
      }
    }
    const top = box.top + items[0].height / 2 + GAP;
    if (placed[0] < top) {
      const shift = top - placed[0];
      for (let index = 0; index < placed.length; index += 1) placed[index] += shift;
    }
    items.forEach((item, index) => {
      const offset = Math.round(placed[index] - item.centre);
      if (offset) item.label.style.marginTop = `${offset}px`;
    });
  };

  // Left edge: the cheapest and dearest prices win over the scale's steps.
  const clearLeftLabels = (scale) => {
    const steps = [...scale.querySelectorAll(".mobileMarketTick.isGrid")];
    steps.forEach((step) => { step.style.visibility = ""; });
    const limits = [...scale.querySelectorAll(".mobileMarketTick.isLimit"), ...scale.querySelectorAll(".mobileMarketKeyTick")].filter(shown);
    steps.filter(shown).forEach((step) => {
      if (limits.some((limit) => overlaps(step, limit, GAP))) step.style.visibility = "hidden";
    });
  };

  // Bottom: every step centred under its mark, pushed in only at the axis'
  // ends; first and last stay (shortened to the number when they meet, the
  // first one hidden if even that does not fit); a middle one shows only
  // with room on both sides.
  const thinAxis = (axis) => {
    const ticks = [...axis.children].filter((tick) => tick.matches("em"));
    ticks.forEach((tick) => {
      tick.style.visibility = "";
      tick.style.transform = "";
      if (tick.dataset.full) tick.textContent = tick.dataset.full;
    });
    const visible = ticks.filter(shown);
    if (!visible.length) return;
    const box = axis.getBoundingClientRect();
    const align = (tick) => {
      tick.style.transform = "translateX(-50%)";
      const rect = tick.getBoundingClientRect();
      if (rect.left < box.left) tick.style.transform = "none";
      else if (rect.right > box.right) tick.style.transform = "translateX(-100%)";
    };
    visible.forEach(align);
    if (visible.length < 2) return;
    const first = visible[0];
    const last = visible[visible.length - 1];
    if (overlaps(first, last, 8)) {
      // "1 · najtańsza" → "1", "150 000 km" → "150 000".
      [first, last].forEach((tick) => {
        tick.dataset.full = tick.textContent;
        tick.textContent = tick.textContent.split(" · ")[0].replace(/\s*km$/, "");
        align(tick);
      });
      if (overlaps(first, last, 8)) first.style.visibility = "hidden";
    }
    let previous = first.style.visibility === "hidden" ? null : first;
    visible.slice(1, -1).forEach((tick) => {
      if ((previous && overlaps(tick, previous, 8)) || overlaps(tick, last, 8)) tick.style.visibility = "hidden";
      else previous = tick;
    });
  };

  // The dearest offer's price sits above its dot; when the dot is at the very
  // top, above would leave the chart — then it goes beside the dot, towards
  // the middle.
  const placePeak = (scale) => {
    const peak = scale.querySelector(".mobileMarketTick.isPeak");
    if (!peak) return;
    peak.style.transform = "";
    if (peak.getBoundingClientRect().top >= scale.getBoundingClientRect().top) return;
    const onRight = Number.parseFloat(peak.style.getPropertyValue("--x")) > 0.5;
    peak.style.transform = onRight ? "translate(calc(-100% - 12px), -50%)" : "translate(12px, -50%)";
  };

  const declutter = () => {
    if (view.hidden) return;
    content.querySelectorAll(".mobileMarketScale").forEach((scale) => {
      placePeak(scale);
      spreadRightLabels(scale);
      clearLeftLabels(scale);
    });
    content.querySelectorAll(".mobileMarketXTicks, .mobileMarketCompareAxis").forEach(thinAxis);
  };

  // A timer, not requestAnimationFrame: a hidden tab gets no frames, and the
  // labels must be in place when the user comes back (or a report is drawn).
  let timer = 0;
  const schedule = () => {
    if (timer) return;
    timer = window.setTimeout(() => {
      timer = 0;
      declutter();
    }, 30);
  };
  new MutationObserver(schedule).observe(content, { childList: true });
  new MutationObserver(schedule).observe(view, { attributes: true, attributeFilter: ["hidden"] });
  new ResizeObserver(schedule).observe(content);
  window.addEventListener("resize", schedule);
  // A hidden tab gets no resize events: measure again when it comes back.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedule();
  });
  document.fonts?.ready.then(schedule);
  schedule();
})();
