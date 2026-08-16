import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deliberately minimal: Vite's defaults (esbuild minify, automatic chunking)
// beat hand-tuning. Don't add manualChunks objects — current Vite rejects the
// object form, and hand-rolled vendor chunks cause circular-init crashes.
export default defineConfig({
  // React Compiler (optional): install babel-plugin-react-compiler
  // @rolldown/plugin-babel @babel/core, then
  //   import react, { reactCompilerPreset } from "@vitejs/plugin-react";
  //   import babel from "@rolldown/plugin-babel";
  //   plugins: [react(), babel({ presets: [reactCompilerPreset()] })]
  // (full verified config: react-core's react-idioms reference)
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // server: { proxy: { "/api": { target: "http://localhost:8080", changeOrigin: true } } },
});
