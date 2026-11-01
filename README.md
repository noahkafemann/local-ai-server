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
- 🔧 **CORS-Proxy-Unterstützung** - Für Browser-Zugriff auf lokale LM-Studio-Instanz

## Voraussetzungen

- [LM Studio](https://lmstudio.ai/) installiert und gestartet
- Ein geladenes Modell in LM Studio
- Local Server in LM Studio aktiviert (Developer → Local Server auf `192.168.2.28:1234`)
- Python 3 (für den optionalen CORS-Proxy)

## Installation

1. Klone das Repository:
```bash
git clone https://github.com/noahkafemann/local-ai-server.git
cd local-ai-server
```

2. Öffne `index.html` direkt im Browser, oder starte einen lokalen Server:
```bash
python -m http.server 8080
# Dann im Browser: http://localhost:8080
```

3. Stelle sicher, dass LM Studio läuft und der Local Server erreichbar ist.

## Wichtig: CORS-Proxy (grundlegende Voraussetzung)

Browser blockieren standardmäßig Anfragen von einer Webseite (selbst localhost) an einen anderen Port/IP im lokalen Netzwerk, wenn der Zielserver keine CORS-Header sendet. LM Studio sendet standardmäßig **keine** CORS-Header. Deshalb schlägt der direkte Zugriff im Browser fehl.

### Lösung: Lokalen CORS-Proxy starten

1. Starte den mitgelieferten Proxy im Projektordner:
```bash
python cors_proxy.py
```
Der Proxy läuft auf `http://localhost:8081` und leitet Anfragen an `http://192.168.2.28:1234` weiter (mit CORS-Headern).

2. Öffne die App im Browser (z.B. `http://localhost:8080` oder `index.html` direkt).

3. Klicke auf das **Zahnrad-Icon** oben rechts und trage ein:
   - **LM Studio Basis-URL:** `http://192.168.2.28:1234`
   - **Lokalen CORS-Proxy verwenden:** ✅ aktivieren
   - **Proxy-URL:** `http://localhost:8081`

4. Klicke **Speichern**. Die App erkennt nun das Modell und du kannst chatten.

### Ohne Proxy (nur in bestimmten Browsern/Einstellungen)

Wenn du den Proxy nicht verwenden möchtest, öffne `index.html` direkt über `file://` im Browser. Einige Browser erlauben dann lokale Netzwerk-Anfragen, andere blockieren sie weiterhin aufgrund von CORS.

## Nutzung über das lokale Netzwerk (anderes Gerät)

Du kannst von einem anderen Gerät im selben WLAN auf deinen KI-Server chatten. Die App ist ein reines Frontend – sie verbindet sich direkt mit deinem LM-Studio-Server.

### Einrichtung für cross-Device Nutzung

1. **LM Studio:** Stelle sicher, dass der Local Server auf `0.0.0.0:1234` läuft (nicht nur `localhost`), damit er im Netzwerk erreichbar ist. Die URL ist dann z.B. `http://192.168.2.28:1234`.

2. **App hosten:** Starte einen lokalen Webserver auf deinem Hauptgerät:
```bash
python -m http.server 8080
```

3. **CORS-Proxy starten** (wichtig, damit der Browser des anderen Geräts nicht blockiert):
```bash
python cors_proxy.py
```
Der Proxy läuft auf `http://localhost:8081` und leitet an `http://192.168.2.28:1234` weiter.

4. **Auf dem anderen Gerät** (Handy, Laptop, Tablet im selben WLAN) öffne:
```
http://<IP-deines-Hauptgeraets>:8080
```
z.B. `http://192.168.2.28:8080`

5. **In der App (Zahnrad):** Trage ein:
   - **LM Studio Basis-URL:** `http://192.168.2.28:1234`
   - **Lokalen CORS-Proxy verwenden:** ✅ aktivieren
   - **Proxy-URL:** `http://192.168.2.28:8081` (die IP deines Hauptgeräts, nicht localhost!)

6. **Speichern** – jetzt kannst du vom anderen Gerät aus chatten.

### Wichtige Hinweise

- Beide Geräte müssen im selben WLAN/Netzwerk sein
- Die Firewall muss Ports 8080 und 8081 erlauben
- LM Studio muss im Local Server Modus laufen und im Netzwerk sichtbar sein
- Alle Chats werden nur lokal im Browser gespeichert, nicht auf dem Server

## GitHub Pages Deployment

Diese Anwendung kann auf GitHub Pages veröffentlicht werden. **Wichtiger Hinweis:**

- GitHub Pages liefert über HTTPS aus, LM Studio nutzt HTTP im lokalen Netzwerk
- Browser blockieren solche "Mixed Content"-Anfragen
- Für die Nutzung auf GitHub Pages benötigst du einen öffentlich erreichbaren CORS-Proxy oder musst LM Studio über HTTPS erreichbar machen

### GitHub Pages einrichten

1. Gehe zu Repository Settings > Pages
2. Source: "Deploy from a branch"
3. Branch: `main` / `(root)`
4. Speichern

Die Seite wird dann unter `https://noahkafemann.github.io/local-ai-server/` verfügbar sein.

## Konfiguration

Die Einstellungen werden über das Zahnrad-Icon in der App vorgenommen und im Browser (localStorage) gespeichert:

- **LM Studio Basis-URL:** z.B. `http://192.168.2.28:1234` (ohne `/v1` am Ende)
- **CORS-Proxy:** URL zu einem lokalen Proxy, z.B. `http://localhost:8081`

## Dateien im Projekt

| Datei | Zweck |
|-------|-------|
| `index.html` | Haupt-HTML-Seite |
| `style.css` | Styling (Dark Mode, Responsive) |
| `app.js` | Anwendungslogik, API-Kommunikation, Rendering |
| `cors_proxy.py` | Lokaler Python-CORS-Proxy für Browser-Zugriff |
| `README.md` | Diese Dokumentation |

## Technologien

- **HTML5** - Semantische Struktur
- **CSS3** - Modernes Styling mit CSS-Variablen
- **Vanilla JavaScript** - Keine Frameworks
- **[Marked.js](https://marked.js.org/)** - Markdown-Parsing (CDN)
- **[Highlight.js](https://highlightjs.org/)** - Syntax-Highlighting (CDN)

## Browser-Kompatibilität

- Chrome/Edge (empfohlen)
- Firefox
- Safari
- Mobile Browser (iOS Safari, Chrome Mobile)

## Einschränkungen

- Funktioniert nur im lokalen Netzwerk oder mit entsprechend konfiguriertem HTTPS-Tunnel
- Benötigt aktiven LM-Studio-Server
- Chatverlauf wird nur lokal im Browser gespeichert (localStorage)
- Keine Multi-User-Unterstützung
- CORS-Proxy erforderlich für zuverlässigen Browser-Zugriff

## Lizenz

Siehe [LICENSE](LICENSE) Datei für Details.
