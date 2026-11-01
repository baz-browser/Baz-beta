export class GlanceParent extends JSWindowActorParent {
  get topWindow() {
    return this.browsingContext.top.embedderElement?.ownerGlobal;
  }

  receiveMessage(message) {
    const win = this.topWindow;
    if (!win?.GlanceManager) return;

    switch (message.name) {
      case "Glance:Open": {
        const embedder = this.browsingContext.top.embedderElement;
        const parentTab = win.gBrowser.getTabForBrowser(embedder);
        win.GlanceManager.open(message.data, parentTab);
        break;
      }
      case "Glance:Cancel":
        // No-op now: GlanceChild only sends "Open" once the hover+Alt
        // delay actually elapses, so there's nothing pending to cancel.
        break;
    }
  }
}
