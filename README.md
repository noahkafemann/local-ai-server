# Local AI Chat - LM Studio Web Interface

Eine moderne, responsive Chat-Webseite im Stil von ChatGPT, die direkt mit deinem lokalen LM-Studio-Server kommuniziert.

## Features

- 🎨 **Modernes Dark-Mode-Design** - Cleanes, minimalistisches Interface
- 💬 **Chatverlauf** - Separate Chats mit Verlaufsspeicherung
- 📝 **Markdown & Code-Darstellung** - Mit Syntax-Highlighting für Code-Blöcke
- ⚡ **Streaming** - Antworten erscheinen live Wort für Wort
- ⌨️ **Tastatursteuerung** - Enter zum Senden, Shift+Enter für Zeilenumbrüche
- 🔄 **Automatische Modellerkennung** - Erkennt das aktive Modell über die LM-Studio API
- 📊 **Verbindungsstatus** - Echtzeit-Anzeige der Serververbindung
- 🗑️ **Chat-Verwaltung** - Neue Chats starten und alle Chats löschen
- 📱 **Responsive Design** - Optimiert für Desktop, Tablet und iPhone
- 💾 **Lokale Speicherung** - Chats werden im Browser gespeichert (localStorage)

## Voraussetzungen

- [LM Studio](https://lmstudio.ai/) installiert und gestartet
- Ein geladenes Modell in LM Studio
- Server auf `http://192.168.2.28:1234` aktiviert (Einstellungen > Developer > Local Server)
- Browser mit JavaScript-Unterstützung

## Installation

1. Klone das Repository:
```bash
git clone https://github.com/noahkafemann/local-ai-server.git
cd local-ai-server
```

2. Öffne `index.html` direkt im Browser, oder hoste es über einen lokalen Server:
```bash
# Mit Python
python -m http.server 8000

# Mit Node.js
npx serve .
```

3. Stelle sicher, dass LM Studio läuft und der Server erreichbar ist.

## Nutzung

1. Starte LM Studio und lade ein Modell
2. Aktiviere den Local Server auf Port 1234
3. Öffne die Webseite
4. Die Anwendung erkennt automatisch das Modell und verbindet sich mit dem Server
5. Starte direkt mit dem Chatten!

## GitHub Pages Deployment

Diese Anwendung kann auf GitHub Pages veröffentlicht werden. **Wichtiger Hinweis zum Mixed-Content-Problem:**

### Problem
GitHub Pages wird über HTTPS ausgeliefert, LM Studio verwendet standardmäßig HTTP. Moderne Browser blockieren HTTP-Anfragen von HTTPS-Seiten (Mixed Content).

### Lösungen

#### Option 1: Lokaler Zugriff (Empfohlen)
Verwende die Anwendung lokal über `file://` oder über einen lokalen HTTP-Server. Dies funktioniert einwandfrei, da keine Mixed-Content-Einschränkung besteht.

#### Option 2: HTTPS für LM Studio (Fortgeschritten)
Wenn du die App auf GitHub Pages nutzen möchtest, musst du LM Studio über HTTPS erreichbar machen. Möglichkeiten:
- Verwende einen Reverse Proxy mit SSL (z.B. nginx mit selbstsigniertem Zertifikat)
- Verwende Tools wie ngrok mit HTTPS-Tunnel
- Nutze CORS-freundliche Tunneling-Lösungen

**Hinweis:** Die Anwendung prüft automatisch auf Mixed Content und zeigt entsprechende Fehlermeldungen.

### GitHub Pages einrichten

1. Gehe zu Repository Settings > Pages
2. Source: "Deploy from a branch"
3. Branch: `main` / `(root)`
4. Speichern

Die Seite wird dann unter `https://noahkafemann.github.io/local-ai-server/` verfügbar sein.

## Konfiguration

Die Server-URL ist in `app.js` konfiguriert:
```javascript
const API_BASE = 'http://192.168.2.28:1234/v1';
```

Falls dein LM-Studio-Server auf einer anderen IP oder Port läuft, ändere einfach diese Konstante.

## Technologien

- **HTML5** - Semantische Struktur
- **CSS3** - Modernes Styling mit CSS-Variablen
- **Vanilla JavaScript** - Keine Frameworks
- **[Marked.js](https://marked.js.org/)** - Markdown-Parsing
- **[Highlight.js](https://highlightjs.org/)** - Syntax-Highlighting

## Browser-Kompatibilität

- Chrome/Edge (empfohlen)
- Firefox
- Safari
- Mobile Browser (iOS Safari, Chrome Mobile)

## Einschränkungen

- Funktioniert nur im lokalen Netzwerk oder mit entsprechend konfiguriertem HTTPS-Tunnel
- Benötigt aktiven LM-Studio-Server
- Chatverlauf wird nur lokal im Browser gespeichert
- Keine Multi-User-Unterstützung

## Lizenz

Siehe [LICENSE](LICENSE) Datei für Details.
