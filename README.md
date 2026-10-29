# <sub><sub><img src="https://raw.githubusercontent.com/rolandzeiner/badegewaesser-austria/main/custom_components/badegewaesser_austria/brand/icon.png" width="40" height="40" alt=""></sub></sub> Badegewässer Austria

[![Marketplace](https://img.shields.io/badge/Marketplace-Catalog-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![HA min version](https://img.shields.io/badge/Home%20Assistant-%3E%3D2025.6-blue.svg)](https://www.home-assistant.io/)
[![Version](https://img.shields.io/github/v/release/rolandzeiner/badegewaesser-austria?label=version&color=blue)](https://github.com/rolandzeiner/badegewaesser-austria/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![vibe-coded](https://img.shields.io/badge/vibe-coded-ff69b4?logo=musicbrainz&logoColor=white)](https://en.wikipedia.org/wiki/Vibe_coding)
[![Live demo](https://img.shields.io/badge/live-demo-2196F3.svg)](https://demo.rolandzeiner.at/#badegewaesser)

Water quality and temperature for all 260 EU-designated bathing waters in Austria, from the official [AGES](https://www.ages.at/) dataset. Follow the lakes you swim in as sensors, each with a card that shows its season at a glance.

> [!WARNING]
> Water quality can change between samples. Follow the notices posted at the bathing water itself.

## Features

- All 260 EU-designated bathing waters, in every province.
- Water temperature, E. coli, enterococci, Secchi depth, the annual EU rating, the last sample date, and closure and bathing-season flags.
- A card that lays the season's samples on a calendar, with an arrow for how each reading moved.
- Pick a lake by province, or from the twelve nearest to your home.
- Readings below the lab's detection limit show as `<15`, never as a measurement.
- Last summer's values stay available out of season, and polling pauses from October to mid-May.
- Each lake on Home Assistant's map, and on OpenStreetMap from the card.
- A repair notice when AGES is down, and the card says so instead of showing an empty season.

## Requirements

- Home Assistant **2025.6.0** or newer.
- An internet connection. No account, no API key, no registration.

## Installation

### Marketplace (recommended)

The Marketplace is HACS, built into Home Assistant since 2026.11.

1. In Home Assistant, go to **Settings → Marketplace** and search for **Badegewässer Austria**.
2. Select it, then select **Install**. The setup starts right away, no restart needed.

[![Open this repository in the Marketplace of your Home Assistant.](https://my.home-assistant.io/badges/marketplace_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=rolandzeiner&repository=badegewaesser-austria&category=integration)

On Home Assistant older than 2026.11, use HACS instead: search for **Badegewässer Austria**, select **Download**, then restart Home Assistant.

### Manual

1. Download `badegewaesser_austria.zip` from the [latest release](https://github.com/rolandzeiner/badegewaesser-austria/releases/latest).
2. Extract it into `config/custom_components/badegewaesser_austria/`.
3. Restart Home Assistant.

## Setup

[![Open your Home Assistant instance and start setting up a new integration.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=badegewaesser_austria)

1. Go to **Settings → Devices & services → Add integration** and search for **Badegewässer Austria**.
2. Choose how to find your lake: **Choose by province**, or **Bathing waters near you** for the twelve closest to your Home Assistant location, nearest first.
3. Pick the bathing water.

| Field | Description |
|---|---|
| **Province** | The Bundesland whose bathing waters are listed. Only for **Choose by province**. |
| **Bathing water** | The lake or river site to follow. Each one is its own entry; add the integration again for a second one. |

## Options

Under **Settings → Devices & services → Badegewässer Austria → Configure**:

| Option | Default | Description |
|---|---|---|
| **During the bathing season** | 6 hours | How often to check from 15 May to 31 August, between 3 and 168 hours. Entries share one poll, so the shortest interval you set applies to all of them. |

## Entities

Each bathing water becomes one device with eight entities.

| Entity | Type | Notes |
|---|---|---|
| Water temperature | `sensor` | °C. Carries the season's samples for the card, and the bathing water's position as `latitude` and `longitude`. The only entity with a position, so each lake gets one marker on the map. |
| E. coli | `sensor` | KBE/100 ml, with a `below_detection_limit` attribute. |
| Enterococci | `sensor` | KBE/100 ml, with a `below_detection_limit` attribute. |
| Secchi depth | `sensor` | Metres. How far down you can see. |
| Water quality | `sensor` | The annual EU classification, plus `rating_year` and `rating_class`. |
| Last sample | `sensor` | When the newest sample was taken. |
| Closed | `binary_sensor` | On when the authority has banned swimming. `closure_reason` says why. Device class `problem`, so it shows up in problem-based dashboards and automations. |
| Bathing season | `binary_sensor` | On between 15 June and 31 August, the season defined in Badegewässerverordnung § 4. |

### Water quality

The EU Bathing Water Directive classifies each bathing water once a year, over the previous four seasons. The card shows each class next to the symbol the EU set for it in Commission Implementing Decision 2011/321/EU:

| State | AGES letter | Card symbol | Meaning |
|---|---|---|---|
| `excellent` | A | ★★★ | Consistently free of faecal contamination |
| `good` | B | ★★ | Stable, occasional elevated readings |
| `sufficient` | C | ★ | Elevated microbial readings occur regularly |
| `poor` | D | – | A swimming ban or advice against swimming follows |

AGES publishes the current year's classification after the season ends, so through the summer and autumn this sensor shows **last year's** rating. The `rating_year` attribute always says which year it means.

### Detection limits

For most samples the laboratory reports "below the detection limit" instead of a number: 901 of 1,362 E. coli samples in the 2026 season. The sensor's state is then the limit, and `below_detection_limit` is `true`. Read `15` with that flag as **"under 15"**, not "15".

## Cards

The card is installed and registered automatically. Add it from the card picker and pick the bathing water by name, or in YAML:

```yaml
type: custom:badegewaesser-austria-card
device: 1a2b3c4d5e6f7890abcdef1234567890
```

It puts the season's samples on a calendar axis, so you can see how often the lake was sampled and how fresh the newest reading is. Hover or tap a measurement to see its season on the track. The pin next to the lake's name opens it on OpenStreetMap.

### Card configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `device` | string | *required* | The bathing water's device. The card finds all of its entities itself. |
| `entity` | string | none | Older alternative to `device`: any one entity of the bathing water. Still honoured so older cards keep working. |
| `name` | string | the lake's name | Overrides the card title. |
| `show_season_track` | boolean | `true` | The season's samples on a calendar axis. |
| `show_readings` | boolean | `true` | Water quality, E. coli, enterococci and Secchi depth, each with an arrow for how it moved since the previous sample. |
| `show_attribution` | boolean | `true` | The "Datenquelle: AGES · CC BY 3.0 AT" line at the bottom. The entities carry the attribution either way. |

## Data updates

AGES publishes all 260 bathing waters in a single document, so one poll serves every lake you follow.

| When | Default | Why |
|---|---|---|
| Readings arrive (15 May – 31 Aug) | every 6 hours | Samples arrive about every 20 days, so this is already far faster than the data moves. The reason for 6 hours is a closure, which can be posted any day. |
| Late results (September) | every 24 hours | Sampling has stopped, but lab results for the last samples of August can still come in. |
| 1 Oct – 14 May | no polls | Nothing changes. The next poll comes on 15 May, at a random time in its first six hours. AGES publishes the new annual classification before the season, so that poll picks it up. |

Home Assistant also fetches the document once at every restart, since the integration keeps no copy on disk. If a poll fails, the integration keeps retrying, daily outside the season, until one succeeds.

The integration sends no `If-Modified-Since` header. AGES regenerates the file every ten minutes whether or not anything changed, so the server would send the whole document anyway. The integration fingerprints the content instead and skips the parse when nothing moved.

## Examples

- Check before you go swimming: the newest water temperature, how old it is, and whether the lake is open.
- Get a notification when your lake is closed.
- Watch the water warm up in spring on a statistics graph.
- Compare lakes by putting their cards side by side.

Get a notification when a bathing ban is posted:

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

<details>
<summary>Get a notification when the water first reaches 22 °C</summary>

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

</details>

## Known limitations

- **Samples are sparse.** Each bathing water is sampled 4 to 9 times a season, about 20 days apart. The card shows every reading with the date it was taken.
- **Nothing changes from September to mid-May.** No samples are taken, so the newest reading stays put until the following summer.
- **One bathing water's position comes from its profile.** AGES publishes `0` / `0` for *Wolfgangsee, St. Gilgen – Gamsjaga*. The integration uses the sampling point from the site's bathing-water profile instead, until AGES publishes one.
- **A few historical ratings use letters AGES does not document.** Two sites carry an `F` or a `G` in an older year. The integration won't publish a letter it can't interpret, so it falls back to the most recent year it can, and keeps the original in `rating_raw`.
- **The per-sample assessment is a raw number.** Each sample carries a 1, 2 or 3 whose meaning AGES does not publish, and sources disagree on whether the scale even has four levels. It is exposed as `sample_assessment` without a label.
- **Closures have not been seen in live data.** `TGESPERRT` was `0` for all 260 sites when this integration was written, so the closure banner follows the documented shape, not an observed one.

## Troubleshooting

- **The card says "Pick a bathing water in the card editor".** The card has no bathing water set. Open the card editor and pick one.
- **The card says an entity isn't part of Badegewässer Austria.** The configured entity belongs to another integration. Pick a bathing water in the card editor; its picker only lists this integration's.
- **All entities are unavailable.** The last fetch failed. Check Home Assistant's log for `badegewaesser_austria`. The integration retries on its own and slows down during a longer outage, so it recovers without help.
- **The card says "No current data from AGES".** The last fetch failed, or none has worked since Home Assistant started. Check **Settings → Repairs**. If it lists an AGES outage, the fault is on their side and the data returns on its own. If it says the bathing water is missing, see the next entry. If there's neither, check that Home Assistant can reach the internet.
- **A repair says my bathing water is missing from the AGES data.** AGES no longer lists that site. It may come back with the next update, or it may have been closed for good, in which case remove the entry.
- **The temperature shows a dash.** That sample has no temperature. AGES reports `0` when nothing was measured, and the integration treats that as missing, not as 0 °C.
- **The card looks out of date and offers to reload.** Your browser has an older copy of the card. Select **Reload**. If the offer comes back, clear the browser cache for your Home Assistant URL.
- **Debug logging.** Add this to `configuration.yaml`, restart, and reproduce the problem:

  ```yaml
  logger:
    default: warning
    logs:
      custom_components.badegewaesser_austria: debug
  ```

## Removal

1. Go to **Settings → Devices & services → Badegewässer Austria**, open the entry's menu and choose **Delete**. That removes its device and all of its entities. Removing the last entry also withdraws the card's dashboard resource.
2. To uninstall, go to **Settings → Marketplace**, open **Badegewässer Austria**, then ⋮ → **Uninstall**. On Home Assistant older than 2026.11, remove it in HACS. For a manual install, delete `config/custom_components/badegewaesser_austria/`. Then restart Home Assistant.

## Attribution

Every entity and the card footer carry:

> Datenquelle: AGES · CC BY 3.0 AT

In full: AGES, Österreichische Agentur für Gesundheit und Ernährungssicherheit GmbH. The data comes from the [„österreichische Badegewässer"](https://www.data.gv.at/) dataset, licensed under [CC BY 3.0 AT](https://creativecommons.org/licenses/by/3.0/at/), whose only condition is attribution.

Icon: Font Awesome Free, CC BY 4.0.

This integration started with an email from Johannes Spreitzer of [zeitwesentech](https://zeitwesentech.com/). His blog post [*Home Assistant – Anzeige der österreichische Badegewässer und Badeplätze*](https://zeitwesentech.com/blog/?p=1037) (June 2024) showed how to put the AGES data on a Home Assistant dashboard with a REST sensor. Thank you, Johannes.

## License

MIT, see [LICENSE](https://github.com/rolandzeiner/badegewaesser-austria/blob/main/LICENSE).

Dev setup, tests and the verification gate: [CONTRIBUTING.md](https://github.com/rolandzeiner/badegewaesser-austria/blob/main/CONTRIBUTING.md).

## Disclaimer

This integration is not affiliated with or endorsed by AGES (Österreichische Agentur für Gesundheit und Ernährungssicherheit GmbH). Its data comes from the AGES [bathing-water dataset](https://www.data.gv.at/) under CC BY 3.0 AT. **Water quality can change between samples. Never rely on this integration to decide whether water is safe to swim in; follow the notices posted at the bathing water itself.** The developer assumes no liability for the accuracy, completeness or timeliness of the displayed values. Use at your own risk.

---

Diese Integration steht in keiner Verbindung zur AGES (Österreichische Agentur für Gesundheit und Ernährungssicherheit GmbH) und wird von ihr nicht unterstützt. Die Daten stammen aus dem [Badegewässer-Datensatz](https://www.data.gv.at/) der AGES und stehen unter CC BY 3.0 AT. **Die Wasserqualität kann sich zwischen zwei Proben ändern. Entscheide nie anhand dieser Integration, ob Wasser zum Baden sicher ist. Richte dich nach den Hinweisen vor Ort.** Für die Richtigkeit, Vollständigkeit und Aktualität der angezeigten Werte wird keine Haftung übernommen. Nutzung auf eigene Verantwortung.
