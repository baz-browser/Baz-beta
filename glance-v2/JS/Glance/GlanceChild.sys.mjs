export class GlanceChild extends JSWindowActorChild {
  actorCreated() {
    this.hoveredLink = null;
    this.modifierActive = false;
    this.hoverTimer = null;

    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  handleEvent(event) {
    if (event.type === "DOMContentLoaded") {
      const doc = this.document;
      doc.addEventListener("mouseover", this.onMouseOver, true);
      doc.addEventListener("mouseout", this.onMouseOut, true);
      // NOTE: Alt alone also toggles Firefox's hidden menu bar on Windows.
      // Swap e.altKey below for e.ctrlKey or e.shiftKey if that bothers you.
      doc.addEventListener("keydown", this.onKeyDown, true);
      doc.addEventListener("keyup", this.onKeyUp, true);
    }
  }

  onKeyDown(e) {
    if (e.altKey) this.modifierActive = true;
  }

  onKeyUp(e) {
    if (!e.altKey) {
      this.modifierActive = false;
      if (this.hoveredLink) this.cancelGlance();
    }
  }

  onMouseOver(e) {
    const link = e.target.closest?.("a[href]");
    if (!link || !link.href.startsWith("http")) return;

    this.hoveredLink = link;
    if (this.hoverTimer) clearTimeout(this.hoverTimer);

    // 300ms hover delay so it doesn't fire on every stray mouse pass.
    this.hoverTimer = this.contentWindow.setTimeout(() => {
      if (this.hoveredLink === link && this.modifierActive) {
        const rect = link.getBoundingClientRect();
        this.sendAsyncMessage("Glance:Open", {
          url: link.href,
          x: rect.left,
          y: rect.bottom,
        });
      }
    }, 300);
  }

  onMouseOut(e) {
    const link = e.target.closest?.("a[href]");
    if (link && link === this.hoveredLink) {
      this.cancelGlance();
    }
  }

  cancelGlance() {
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
    this.hoveredLink = null;
    this.sendAsyncMessage("Glance:Cancel", {});
  }

  async receiveMessage(message) {
    // Parent -> child messages aren't used yet in this prototype.
  }
}
