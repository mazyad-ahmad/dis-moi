import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// jsdom ne sait pas ouvrir un <dialog> : version minimale de showModal() et close().
// (Rien à faire dans les fichiers de test sans DOM.)
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
