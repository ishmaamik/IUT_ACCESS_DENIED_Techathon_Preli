# Hardware / Electrical Schematic — Work Room 1 (representative)

This is a **concept/simulation circuit only** — no real hardware is built or
required for the hackathon deliverable. It shows how the office's fans and
lights would realistically be wired and sensed by a microcontroller. Per the
problem statement, this covers **one room** (Work Room 1: 2 fans + 3 lights)
rather than all 15 devices; the same pattern repeats per room.

<p align="center">
  <img src="../diagrams/circuit-diagram.jpeg" width="900" alt="Circuit schematic built in Tinkercad"><br>
  <sub>Built circuit — ESP32, 5× relay modules, ACS712 current sensor, PC817 opto-isolator</sub>
</p>

Public, interactive circuit (open it, run the simulation, inspect every
wire): [tinkercad.com/things/f2TzNStu8S2-circuitdiagram-iutaccessdenied](https://www.tinkercad.com/things/f2TzNStu8S2-circuitdiagram-iutaccessdenied?sharecode=eXU-W0rWGKZVqE3sbP60KwTWugR9m_Dr4NV5aAKc_yA)

⚠️ **Safety note:** Fans and room lights are mains-voltage (110/220V AC)
loads. A microcontroller GPIO never switches mains directly — it drives a
relay module, which does the actual switching on the isolated high-voltage
side. Any real build of the mains-side wiring described here must be done by
someone qualified to work with mains electricity. This document is a design
reference, not a real installation guide.

## Why this design

The brief asks for "a microcontroller (ESP32/Arduino) reading the on/off
state of lights and fans, and optionally sensing current draw." That's two
distinct jobs, wired two distinct ways:

1. **Control** — ESP32 GPIO → relay module → mains load. The relay is the
   only thing that touches mains; the GPIO side stays at 3.3V logic.
2. **Sensing** — two different techniques, one per requirement:
   - **Current draw** (optional): an ACS712 Hall-effect sensor placed
     in-line with one load's live conductor, read on an ESP32 ADC pin.
   - **On/off state, independently of what the ESP32 commanded**: a
     PC817 opto-isolator tapped across a load's switched output. This
     matters because in a real retrofit, a fan/light might still have its
     original wall switch — the ESP32 needs a way to know the load is
     energized that doesn't depend on it being the one that turned it on.

## Bill of materials (one room)

| Qty | Part | Role |
|---|---|---|
| 1 | ESP32 DevKit V1 | Microcontroller |
| 5 | 5V single-channel relay module (opto-isolated input) | One per device: 2 fans, 3 lights |
| 1 | ACS712-05B current sensor module | Current sensing on the Fan 1 branch |
| 1 | PC817 opto-isolator (or ready-made opto-isolator module) | Independent on/off sensing on the Light 1 branch |
| 2 | 10kΩ resistor | Voltage divider, ACS712 output → ESP32 ADC |
| 1 | 1kΩ resistor | Opto-isolator LED current-limit |
| — | 5x mains-rated loads (2 fans, 3 lights) | Simulated in Wokwi/Tinkercad — see below |

## Pin-mapping table (ESP32 DevKit V1)

| Function | Connects to | ESP32 pin | Notes |
|---|---|---|---|
| Fan 1 relay control | Relay 1 `IN` | GPIO16 | Digital out; most low-level-trigger relay boards are active-LOW |
| Fan 2 relay control | Relay 2 `IN` | GPIO17 | Digital out |
| Light 1 relay control | Relay 3 `IN` | GPIO18 | Digital out |
| Light 2 relay control | Relay 4 `IN` | GPIO19 | Digital out |
| Light 3 relay control | Relay 5 `IN` | GPIO21 | Digital out |
| Current sense (Fan 1 branch) | ACS712 `OUT` → divider midpoint | GPIO34 (ADC1_CH6) | Input-only ADC pin — correct choice, no output duty on this pin |
| AC-presence sense (Light 1 branch) | PC817 collector | GPIO35 (ADC1_CH7, used digitally) | Input-only pin; pulled up in software |
| Shared logic ground | Relay GNDs, ACS712 GND, opto GND | GND | One common reference — required for the ADC and digital reads to mean anything |
| Shared logic supply | Relay VCCs, ACS712 VCC, opto VCC | 5V (VIN) | From USB or an external 5V supply — do not power relay coils from the ESP32 3.3V rail |

## Connection list

**Control path (repeat per device, shown for Fan 1):**
- ESP32 `GPIO16` → Relay 1 `IN`
- ESP32 `5V` → Relay 1 `VCC`
- ESP32 `GND` → Relay 1 `GND`
- Relay 1 `COM` → mains Live feed
- Relay 1 `NO` → Fan 1 Live terminal
- Fan 1 Neutral → shared Neutral bus

**Current sensing (Fan 1 branch only, demonstrating the pattern):**
- Break Fan 1's Live conductor and route it through ACS712 `IP+` → `IP-`
  (the sensor must carry the load's actual current, not just tap a voltage)
- ACS712 `VCC` → 5V, `GND` → shared GND
- ACS712 `OUT` → midpoint of a 10kΩ/10kΩ divider between `OUT` and `GND`
- Divider midpoint → ESP32 `GPIO34`

**Independent state sensing (Light 1 branch only, demonstrating the pattern):**
- PC817 LED anode ← 1kΩ resistor ← a low-voltage tap that's live only when
  Light 1's circuit is energized (in a ready-made opto-isolator *module*,
  this current-limiting and mains-side rectification is already built in —
  use the module rather than a bare PC817 against mains)
- PC817 collector → ESP32 `GPIO35` (pulled up), emitter → GND
- When Light 1 is energized, the opto's transistor pulls `GPIO35` low —
  Claude Code reads that as ON regardless of which switch turned it on

## Electrical reasoning

- **Relay coil current**: typical 5V relay modules draw ~70–80mA per
  channel when energized. Five channels simultaneously can draw ~400mA,
  which is within a USB-powered ESP32 dev board's 5V rail budget but worth
  noting if adding more channels — use an external 5V supply for anything
  larger than a few relays.
- **ACS712 divider**: the 5A variant outputs `2.5V ± 0.185V/A`. At 5V logic
  it can swing up to ~3.4V under load, above the ESP32's safe 3.3V ADC
  input. The 10kΩ/10kΩ divider halves that to a safe ~1.7V max, well within
  range — the firmware just doubles the reading back in software.
- **Opto-isolator**: the entire point is galvanic isolation — the ESP32's
  GND and 3.3V logic never share a conductive path with the mains side.
  This is the standard, correct way to sense a mains-side state from a
  low-voltage microcontroller.
- **Input-only ADC pins**: GPIO34/35 on the ESP32 have no output driver —
  correct choice for pure sensing inputs, and a good habit to keep sensing
  and control pins visually distinct in the pin map.

## Building this in Wokwi or Tinkercad

Wokwi and Tinkercad can't simulate real mains voltage, so the mains-side
parts above are conceptual (documented for realism) and the simulation
substitutes low-voltage stand-ins:

1. **ESP32 DevKit V1** — both platforms have this as a standard part.
2. **Relay modules** — Wokwi has a single-channel relay part; place 5 of
   them and wire `IN`/`VCC`/`GND` per the pin table above.
3. **Simulated loads** — since neither simulator does real AC: wire an LED
   + current-limiting resistor to each relay's `COM`/`NO` output to stand
   in for a light, and a small DC hobby motor (or a second LED, labeled) to
   stand in for a fan. This preserves the control topology (GPIO → relay →
   switched load) without simulating mains.
4. **Current sensor** — check the simulator's part library for "ACS712"
   first. If it isn't available in your Wokwi/Tinkercad version, substitute
   a potentiometer wired to `GPIO34` as an explicitly-labeled stand-in for
   "current sensor reading" — the firmware and ADC-reading logic are
   identical either way; only the physical sensor differs.
5. **Opto-isolator** — same approach: use the real part if the simulator
   has it, otherwise a simple switch + pull-up on `GPIO35` demonstrates the
   same "independent on/off sensing" concept.

The finished simulation is built and shared publicly (screenshot and link
at the top of this document) — the layout above is exactly what it follows.

## Minimal firmware sketch (concept)

```cpp
const int fanRelayPins[2] = {16, 17};
const int lightRelayPins[3] = {18, 19, 21};
const int currentSensePin = 34; // ACS712 via divider
const int presenceSensePin = 35; // opto-isolator

void setup() {
  Serial.begin(115200);
  for (int pin : fanRelayPins) pinMode(pin, OUTPUT);
  for (int pin : lightRelayPins) pinMode(pin, OUTPUT);
  pinMode(presenceSensePin, INPUT_PULLUP);
}

void loop() {
  int raw = analogRead(currentSensePin);
  float sensedVoltage = (raw / 4095.0) * 3.3 * 2.0; // undo the divider
  float amps = (sensedVoltage - 2.5) / 0.185;        // ACS712-05B scale

  bool light1EnergizedIndependently = digitalRead(presenceSensePin) == LOW;

  Serial.printf("Fan1 current: %.2fA | Light1 sensed ON: %s\n",
                amps, light1EnergizedIndependently ? "yes" : "no");
  delay(1000);
}
```

This sketch is illustrative — the hackathon demo itself runs entirely on
the software simulator in `backend/simulator/`, which is the actual data
source for the dashboard and bot. This circuit exists to show the design
would translate to real hardware, not to be wired into the running demo.
