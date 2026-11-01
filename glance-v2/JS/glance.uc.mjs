// ==UserScript==
// @name           Glance v2 - real tab architecture
// @description    Zen-inspired hover+Alt link preview, backed by a real gBrowser tab
// @include        main
// @WindowActor    Glance
// @WindowActorMatches ["http://*/*","https://*/*"]
// @onlyonce
// ==/UserScript==

window.GlanceManager = {
  _glances: new Map(),

  /**
   * Opens a URL as a Glance: a real background tab whose panel is shown
   * and styled as a floating overlay instead of switching the tab strip.
   */
  open({ url, x = 0, y = 0, width, height }, parentTab = gBrowser.selectedTab) {
    const id = crypto.randomUUID();

    const newTab = gBrowser.addTab(url, {
      ownerTab: parentTab,
      skipAnimation: true,
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    });
    newTab.setAttribute("zen-glance-tab", "true");
    newTab.setAttribute("glance-id", id);
    parentTab.setAttribute("glance-id", id);

    this._glances.set(id, { tab: newTab, parentTab });

    // Let Firefox's own tabbrowser display this tab's panel normally, then
    // style *that panel* as a floating overlay - no manual DOM reparenting
    // of browser elements, which is fragile with remote browsers.
    gBrowser.selectedTab = newTab;
    const panel = gBrowser.getPanel(newTab.linkedBrowser);
    panel.classList.add("glance-overlay");
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    if (width) panel.style.width = `${width}px`;
    if (height) panel.style.height = `${height}px`;
    requestAnimationFrame(() => panel.classList.add("open"));

    return id;
  },

  /**
   * Closes a Glance. Cleanup (map entry + attributes) happens FIRST and
   * unconditionally, before any animation/removal step - this is the fix
   * for the bug found in Zen's #finalizeGlanceClosing, where an early
   * return (missing parentTab) skipped cleanup and leaked a Blob URL.
   */
  close(id) {
    const entry = this._glances.get(id);
    this._glances.delete(id); // <- unconditional, happens no matter what follows
    if (!entry) return;

    try {
      const panel = entry.tab.linkedBrowser && gBrowser.getPanel(entry.tab.linkedBrowser);
      panel?.classList.remove("open", "glance-overlay");
    } finally {
      // finally: guarantees this runs even if the panel step throws.
      if (entry.parentTab?.isConnected) {
        entry.parentTab.removeAttribute("glance-id");
      }
      if (gBrowser.tabs.includes(entry.tab)) {
        if (gBrowser.selectedTab === entry.tab && entry.parentTab?.isConnected) {
          gBrowser.selectedTab = entry.parentTab;
        }
        gBrowser.removeTab(entry.tab, { animate: false, skipPermitUnload: true });
      }
    }
  },

  /**
   * Handles BOTH directions: the glance tab itself closing (e.g. Ctrl+W),
   * or its PARENT tab closing while the glance is still open. That second
   * case is exactly the scenario behind the leak found in Zen's code.
   */
  onTabClose(event) {
    const tab = event.target;
    if (!tab.getAttribute("glance-id")) return;

    for (const [id, entry] of this._glances) {
      if (entry.tab === tab || entry.parentTab === tab) {
        this.close(id);
      }
    }
  },
};

window.addEventListener("TabClose", (e) => window.GlanceManager.onTabClose(e));
