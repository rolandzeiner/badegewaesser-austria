# Badegewässer Austria

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![HA min version](https://img.shields.io/badge/Home%20Assistant-%3E%3D2025.6-blue.svg)](https://www.home-assistant.io/)
[![Version](https://img.shields.io/github/v/release/rolandzeiner/badegewaesser-austria?label=version&color=blue)](https://github.com/rolandzeiner/badegewaesser-austria/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![vibe-coded](https://img.shields.io/badge/vibe-coded-ff69b4?logo=musicbrainz&logoColor=white)](https://en.wikipedia.org/wiki/Vibe_coding)

Water quality and temperature for all 260 EU-designated Austrian bathing waters, from the official [AGES](https://www.ages.at/) dataset. Pick your lake by province or by distance from home — no API key, no YAML.

<!-- toc -->

## Contents

- [Supported Functions](#supported-functions)
- [Requirements](#requirements)
- [Installation](#installation)
- [Setup](#setup)
- [Entities](#entities)
- [Data Updates](#data-updates)
- [Lovelace card](#lovelace-card)
- [Use Cases](#use-cases)
- [Automation Examples](#automation-examples)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)
- [Removal](#removal)
- [Attribution](#attribution)
- [License](#license)
- [Disclaimer](#disclaimer)

<!-- tocstop -->

## Supported Functions

- **All 260 EU-designated bathing waters**, across every Bundesland — Burgenland 20, Niederösterreich 28, Wien 17, Kärnten 32, Steiermark 32, Oberösterreich 43, Salzburg 37, Tirol 35, Vorarlberg 16 *(0.1.0)*
- **Six sensors and two binary sensors per bathing water** — water temperature, E. coli, enterococci, Secchi depth, the annual EU classification, the sampling date, a closure flag and a bathing-season flag *(0.1.0)*
- **A Lovelace card built around the season**, not the instant. The samples sit on a calendar axis from 15 May to 31 August, so you can see the rhythm of the season and how fresh the newest reading is *(0.1.0)*
- **Find a lake by distance** — the setup flow can rank bathing waters by how far they are from your Home Assistant location *(0.1.0)*
- **Honest about detection limits** — most samples report "below the laboratory's detection limit" rather than a measured count. The card shows `<15`, and the sensor carries a `below_detection_limit` attribute, so you never read a limit as a measurement *(0.1.0)*
- **Keeps working out of season** — from September to mid-May nothing new is sampled, but last summer's readings and the annual classification stay valid. Your entities stay available and keep showing them *(0.1.0)*
- **One request for every lake you follow** — all 260 arrive in a single document, so ten config entries still cost one HTTP request per poll *(0.1.0)*
- **A photo of the bathing spot** — the picture AGES shows for the site, as an `image` entity and as the card's header, with the name, the Bundesland and the water temperature over it. Its credit is behind the ⓘ button on the photo. 259 of the 260 have one *(0.2.0)*
- **On the map** — each bathing water shows up as a marker on Home Assistant's map, and the pin next to its name on the card opens it on OpenStreetMap. Nothing loads from OpenStreetMap until you select the pin *(0.2.0)*

## Requirements

- Home Assistant **2025.6.0** or newer
- An internet connection. No account, no API key, no registration.

## Installation

### HACS (recommended)

1. In HACS, open the three-dot menu and choose **Custom repositories**.
2. Add `https://github.com/rolandzeiner/badegewaesser-austria` with category **Integration**.
3. Search for **Badegewässer Austria** and install it.
4. Restart Home Assistant.

### Manual

1. Download `badegewaesser_austria.zip` from the [latest release](https://github.com/rolandzeiner/badegewaesser-austria/releases/latest).
2. Extract it into `config/custom_components/badegewaesser_austria/`.
3. Restart Home Assistant.

## Setup

Go to **Settings → Devices & services → Add integration** and search for **Badegewässer Austria**. You then choose how to find your lake:

- **Choose by province** — pick a Bundesland, then a bathing water from that province's list.
- **Bathing waters near you** — the twelve closest to your Home Assistant location, nearest first.

Either way you end up with one config entry per bathing water. Add the integration again for a second lake.

To change how often it checks, open the entry's **Configure** dialog. See [Data Updates](#data-updates).

## Entities

Each bathing water becomes one device with eight entities, plus a photo where AGES has one.

| Entity | Type | Notes |
|---|---|---|
| Water temperature | `sensor` | °C. Carries the season's samples for the card, and the bathing water's position as `latitude` and `longitude`. The only entity with a position, so each lake gets one marker on the map. |
| E. coli | `sensor` | KBE/100 ml, with a `below_detection_limit` attribute. |
| Enterococci | `sensor` | KBE/100 ml, with a `below_detection_limit` attribute. |
| Secchi depth | `sensor` | Metres. How far down you can see. |
| Water quality | `sensor` | The annual EU classification, plus `rating_year` and `rating_class`. |
| Last sample | `sensor` | When the newest sample was taken. |
| Closed | `binary_sensor` | On when the authority has banned swimming. `closure_reason` says why. |
| Bathing season | `binary_sensor` | On between 15 June and 31 August, the season defined in Badegewässerverordnung § 4. |
| Photo | `image` | The bathing spot, where AGES has a photo. Its attribution names who to credit. |

### Water quality

The EU Bathing Water Directive classifies each bathing water once a year, over the previous four seasons. The card shows each class next to the symbol the EU set for it in Commission Implementing Decision 2011/321/EU:

| State | AGES letter | Card symbol | Meaning |
|---|---|---|---|
| `excellent` | A | ★★★ | Consistently free of faecal contamination |
| `good` | B | ★★ | Stable, occasional elevated readings |
| `sufficient` | C | ★ | Elevated microbial readings occur regularly |
| `poor` | D | – | A swimming ban or advice against swimming follows |

The current year's classification is empty until AGES publishes it after the season ends, so through the summer and autumn this sensor shows **last year's** rating. The `rating_year` attribute always says which year it means.

### Detection limits

For most samples the laboratory reports "below the detection limit" rather than a number — 901 of 1,362 E. coli samples in the 2026 season. The sensor's state is the limit, and `below_detection_limit` is `true`. Read `15` with that flag as **"under 15"**, not "15".

## Data Updates

The integration polls once for every bathing water you follow, because AGES publishes all 260 in a single document.

| When | Default | Why |
|---|---|---|
| Readings arrive (15 May – 31 Aug) | every 6 hours | Samples arrive about every 20 days, so this is already far faster than the data moves. The reason for 6 hours is a closure, which can be posted any day. |
| Rest of the year | every 24 hours | Nothing changes. This is a courtesy poll that picks up the new annual classification when AGES publishes it. |

You can set both intervals in the entry's **Configure** dialog, between 3 and 168 hours. Entries share one poll, so the shortest interval you set applies to all of them.

The integration sends no `If-Modified-Since` header, on purpose. AGES regenerates the file every ten minutes whether or not anything changed, so a cached copy is never considered fresh and the request would return the whole document anyway. Instead it fingerprints the content and skips the parse when nothing moved.

## Lovelace card

The card is installed and registered automatically. Add it from the card picker, or:

```yaml
type: custom:badegewaesser-austria-card
device: 1a2b3c4d5e6f7890abcdef1234567890
```

The editor's picker fills this in for you — pick the bathing water by name.

### Card configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `device` | string | *required* | The bathing water's device. The card finds all of its entities itself. |
| `entity` | string | — | Legacy alternative to `device`: any one entity of the bathing water. Still honoured so older cards keep working. |
| `name` | string | the lake's name | Overrides the card title. |
| `show_photo` | boolean | `true` | The photo of the bathing spot as the card's header, with the name and temperature over it. Only where there is one. |
| `show_season_track` | boolean | `true` | The season's samples on a calendar axis. |
| `show_readings` | boolean | `true` | Water quality, E. coli, enterococci and Secchi depth. |
| `show_attribution` | boolean | `true` | The "Datenquelle: AGES · CC BY 3.0 AT" line at the bottom. The entities carry the attribution either way. |

## Use Cases

- **Decide whether to go swimming.** One glance gives the newest water temperature, how long ago it was measured, and whether the lake is open.
- **Get told when your lake is closed.** The `Closed` binary sensor has device class `problem`, so it shows up in a problem-based dashboard or automation without extra configuration.
- **Watch the water warm up in spring.** The temperature sensor records history, so a statistics card shows the season's curve.
- **Compare lakes.** Add several entries and put their cards side by side.

## Automation Examples

Notify when a bathing ban is posted:

```yaml
automation:
  - alias: "Bathing water closed"
    triggers:
      - trigger: state
        entity_id: binary_sensor.naturbadesee_konigsdorf_closed
        to: "on"
    actions:
      - action: notify.persistent_notification
        data:
          title: "Swimming prohibited"
          message: >-
            {{ state_attr('binary_sensor.naturbadesee_konigsdorf_closed',
                          'closure_reason') or 'No reason given.' }}
```

Notify when the water first reaches 22 °C:

```yaml
automation:
  - alias: "Water warm enough"
    triggers:
      - trigger: numeric_state
        entity_id: sensor.naturbadesee_konigsdorf_water_temperature
        above: 22
    conditions:
      - condition: state
        entity_id: binary_sensor.naturbadesee_konigsdorf_bathing_season
        state: "on"
    actions:
      - action: notify.persistent_notification
        data:
          message: "The lake is at {{ states('sensor.naturbadesee_konigsdorf_water_temperature') }} °C."
```

## Troubleshooting

**The card says "Pick a bathing water in the card editor".**
The card has no `entity` set. Open the card editor and choose one.

**The card says an entity isn't part of Badegewässer Austria.**
The configured entity belongs to another integration. Pick one from this integration — the editor's picker is already filtered.

**All entities are unavailable.**
The last fetch failed. Check Home Assistant's log for `badegewaesser_austria`. The integration retries on its own and slows down during a sustained outage, so it recovers without help.

**A repair says my bathing water is missing from the AGES data.**
AGES no longer lists that site. It may come back on the next update, or it may have been decommissioned. The entities stay unavailable until it returns; if it was closed for good, remove the entry.

**The temperature shows a dash.**
That sample has no temperature. AGES reports `0` when nothing was measured, and the integration treats that as missing rather than as 0 °C.

**The card shows no photo.**
AGES has no photo for *Naturbadesee Königsdorf*. For any other bathing water, check that **Show the photo** is on in the card editor.

**The card looks out of date and offers to reload.**
Your browser cached an older version of the card than the integration ships. Click **Reload**. If it comes back, clear the browser cache for your Home Assistant URL.

**Getting a debug log**

```yaml
logger:
  default: warning
  logs:
    custom_components.badegewaesser_austria: debug
```

## Known Limitations

- **Samples are sparse.** Each bathing water is sampled 4 to 9 times a season, about 20 days apart. This is not live data and the card does not pretend otherwise — every reading is shown with the date it was taken.
- **Nothing changes from September to mid-May.** No samples are taken, so the newest reading stays put until the following summer.
- **One bathing water's position comes from its profile.** AGES publishes `0` / `0` for *Wolfgangsee, St. Gilgen – Gamsjaga*. The integration uses the sampling point from the site's bathing-water profile instead, until AGES publishes one.
- **A few historical ratings use letters AGES does not document.** Two sites carry an `F` or a `G` in an older year. The integration will not publish a letter it cannot interpret, so it falls back to the most recent year it can, and keeps the original in `rating_raw`.
- **The per-sample assessment is a raw number.** Each sample carries a 1, 2 or 3 whose meaning AGES does not publish; sources disagree on whether the scale even has four levels. It is exposed as `sample_assessment` without a label rather than guessed at.
- **The photos are years old.** Most were taken between 2008 and 2016, the newest in 2020, so a bathing spot may look different today.
- **Closures have not been seen in live data.** `TGESPERRT` was `0` for all 260 sites when this integration was written, so the closure banner is built to the documented shape rather than an observed one.

## Removal

Go to **Settings → Devices & services → Badegewässer Austria**, open the entry's menu and choose **Delete**. That removes its device and all of its entities. Removing the last entry also withdraws the Lovelace card resource.

To uninstall completely, remove the integration in HACS and restart Home Assistant.

## Attribution

Every entity except the photo, and the card footer, carry:

> Datenquelle: AGES · CC BY 3.0 AT

In full: **AGES — Österreichische Agentur für Gesundheit und Ernährungssicherheit GmbH**.

Data from the [„österreichische Badegewässer"](https://www.data.gv.at/) dataset published by AGES, licensed under [CC BY 3.0 AT](https://creativecommons.org/licenses/by/3.0/at/). Attribution is the only condition.

The photos are not part of that dataset and not under its licence. They come from the AGES bathing-water pages, and each one carries its own credit, behind the ⓘ button on the photo in the card and as the photo entity's attribution. The credit names the rights holder given in the site's bathing-water profile, or else the photographer recorded in the file, or else AGES.

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

This integration is not affiliated with or endorsed by AGES — Österreichische Agentur für Gesundheit und Ernährungssicherheit GmbH. All bathing-water data comes from the AGES dataset under the Creative Commons Attribution 3.0 Austria (CC BY 3.0 AT) licence. The developer assumes no liability for the accuracy, completeness or timeliness of the displayed values. **Water quality can change between samples. Never rely on this integration to decide whether water is safe to swim in — follow the notices posted at the bathing water itself.** Use at your own risk.

---

Diese Integration steht in keiner Verbindung zur AGES — Österreichische Agentur für Gesundheit und Ernährungssicherheit GmbH und wird von dieser nicht unterstützt. Alle Badegewässerdaten stammen aus dem AGES-Datensatz und stehen unter der Creative-Commons-Lizenz Namensnennung 3.0 Österreich (CC BY 3.0 AT). Für die Richtigkeit, Vollständigkeit und Aktualität der angezeigten Werte wird keine Haftung übernommen. **Die Wasserqualität kann sich zwischen zwei Proben ändern. Entscheide nie anhand dieser Integration, ob Wasser zum Baden sicher ist — richte dich nach den Hinweisen vor Ort.** Nutzung auf eigene Verantwortung.
