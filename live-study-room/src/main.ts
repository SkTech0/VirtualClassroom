// Polyfills for Node-style globals (required by simple-peer and dependencies in browser)
const g = typeof globalThis !== 'undefined' ? globalThis : window;
(g as unknown as { global?: unknown }).global = g;
(g as unknown as { process?: { env: Record<string, string>; nextTick: (fn: () => void) => void } }).process = {
  env: {},
  nextTick: (fn: () => void) => queueMicrotask(fn),
};

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
