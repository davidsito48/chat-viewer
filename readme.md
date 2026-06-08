# Local Chat Log Rebuilder

A lightweight, zero-dependency local web application to parse plain text chat logs (formatted as `M/D/YY, HH:MM - User: Message`) and reconstruct them into a clean, readable, interactive chat UI.

### Features
* **Zero External Dependencies:** Built entirely with Vanilla HTML5, CSS3, and modern JavaScript.
* **100% Private:** File parsing happens purely in-browser via the `FileReader` API. Your data never leaves your machine.
* **Interactive Navigation:** Dynamic sender alignment swapping, global string searching with Up/Down match traversal, dark theme mode, and fluid font scaling.
* **Dual View Layouts:** Toggle instantly between a compact Mobile layout and a broad Desktop layout.

---

## 🚀 Live Demo (GitHub Pages)
You can use the application directly without installing anything by visiting the live deployment here:
👉 **[https://<your-github-username>.github.io/<your-repo-name>/](https://pages.github.com/)**

---

## 🐳 Run Locally via Docker

If you prefer to run the application locally as a standalone containerized service or deploy it to a private home server, a pre-built image is available on Docker Hub.

### 1. Pull the Image
```bash
docker pull davidsitor48/chat-viewer:latest
