# IGNIS-0G · The Six-Inch Test
### NASA Space Apps Challenge 2026 · *Flame in Freefall*

An interactive scientific exploration and flight certification simulator comparing standard Earth flammability screening (**NASA-STD-6001B**) against real microgravity and reduced-gravity combustion behavior.

---

## 🚀 The Core Problem

NASA qualifies materials for human spacecraft using the **Six-Inch Test** (NASA-STD-6001B Test 1): a material strip is ignited at the bottom in upward airflow under normal Earth gravity (1 g, still air). If the flame climbs less than six inches before extinguishing, the material passes and is certified for cabin use.

However, in microgravity (0 g Orbit) or partial gravity (0.16 g Moon, 0.38 g Mars):
- **Buoyancy disappears or weakens**: Hot gases no longer rise rapidly, eliminating the cooling draft and high-shear buoyant plume.
- **Forced ventilation feeds the flame**: Cabin air circulation (2–15 cm/s) steadily supplies fresh oxygen to the reaction zone without blowing it out.
- **Negative Margin of Safety**: Materials that self-extinguish on Earth can burn steadily in spacecraft atmospheres at lower oxygen concentrations than required on Earth.

**IGNIS-0G** lets users set cabin environmental parameters, test five common spaceflight materials on Earth, deploy them to a lunar cabin, and uncover the fires conventional ground tests miss.

---

## 🔬 Calibrated Reduced-Order Combustion Model

The simulation is calibrated against flight data from NASA combustion experiments aboard the International Space Station (ISS):

- **BASS & BASS-II (Burning and Suppression of Solids)**:
  - PMMA acrylic rod and slab testing (NASA/TM-20210011385, Olson et al.).
  - Demonstrates the lower microgravity flammability floor (13.6% O₂ in 0 g vs. 16.0% in 1 g—a 2.4-point negative margin of safety).
  - Radiative quenching extinction below ~2 cm/s opposed flow and convective blow-off extinction near 40 cm/s.
  - SIBAL cotton-fiberglass fabric concurrent flame spread rates and extinction limits.
- **SoFIE-GEL (Growth and Extinction Limit)**:
  - 4 cm acrylic spheres tested across 0.2 to 80 cm/s flow and 13% to 28% O₂ (NTRS 20240007628).
  - Fixes the transition curve between low-speed radiative quenching and high-speed convective blow-off.
- **FLEX & FLEX-2 (Flame Extinguishment Experiment)**:
  - Heptane droplets in microgravity exhibiting quasi-steady burning followed by sustained, low-temperature, non-luminous **cool flame** reactions after visible flame extinction (Dietrich et al., Nayagam et al.). Enforces thermal imaging verification protocols.
- **SAME & SAME-R (Smoke Aerosol Measurement Experiment)**:
  - Microgravity smoke particle dynamics showing that the absence of buoyant convective drift leads to larger particle aggregates, requiring dual-wavelength optical scattering and particle-size discrimination.

---

## 🛰️ 24 NASA PSI Combustion Science Investigations

IGNIS-0G integrates a searchable and dynamic ranking engine across **24 NASA Physical Sciences Informatics (PSI)** combustion investigations across four core research pillars:

1. **Flammability**: BASS, BASS-II, Saffire I–VI, SoFIE-MIST, SoFIE-GEL, SoFIE-RTDFS, SoFIE-SMURF, ACME BRE, BRE-2.
2. **Gas Flames**: ACME E-FIELD, ACME Coflow (CLD), ACME s-Flame, ACME Flame Design, SLICE, ACME CFI-G.
3. **Smoke Detection**: SAME, SAME-R, SPICE, DAFT, DAFT-2.
4. **Suppression**: FLEX, FLEX-2, FLEX-2J, Cool Flames Investigation (CFI).

The Step 6 PSI Mission Ranker correlates user-configured cabin parameters (O₂, pressure, ventilation, gravity) against flight test envelopes, reporting real-time match scores, key findings, and next-generation spacecraft hardware design rules.

---

## 🕹️ Interactive Modules

1. **Hero Gravity Candle (`#gs`)**: Real-time canvas simulation showing the physical transition of a candle flame from an elongated 1 g buoyant teardrop to a spherical, diffusion-limited 0 g blue flame.
2. **Step 1: Set the Cabin Atmosphere (`#s1`)**: Three environmental controls (O₂ %, Cabin Pressure kPa, Ventilation cm/s) driving hypoxia partial pressure floors, bends protection scores, fire-effective oxygen indices, dual-chamber split simulation canvas (`#lab`), and modeling CSV/JSON export engines.
3. **Step 2: Six-Inch Material Strip Tests (`#s2`)**: Five candidate materials (*Acrylic panel*, *Cotton-glass cloth*, *Silicone rubber*, *Nomex fabric*, *ETFE insulation*) with individual ignition benches and batch "Burn all five" execution.
4. **Step 3: Lunar Cabin Launch & Scoring (`#s3`)**: Certifies approved materials at lunar gravity (0.16 g) under active ventilation, calculating bends decompression protection plus material retention score, or flagging hidden fire disasters with zero score.
5. **Step 4: Cool Flame Extinguishment (`#s4`)**: Demonstrates invisible low-temperature droplet combustion with optical camera vs. thermal infrared view toggles and suppressant dwell-time protocols.
6. **Step 5: Smoke Detector Tuning (`#s5`)**: Compares Earth vs. microgravity smoke aggregation and tunes sensor particle-size thresholds and dual-wavelength detection windows.
7. **Step 6: PSI Investigation Ranker (`#s6`)**: Ranks all 24 NASA PSI flight records against active cabin parameters with full briefing summaries and pillar filters.
8. **Step 7: Earth Spin-Off Translator (`#s7`)**: Translates space discoveries into terrestrial safety systems (clean-agent mist suppression for data centers, smart home smoke alarms, and high-rise stairwell smoke-control HVAC logic).
9. **Step 8: Reality Check Calibration Charts (`#s8`)**: Side-by-side validation charts (`#rcA` through `#rcD`) contrasting initial model assumptions vs. calibrated models against raw published ISS flight data.
10. **Appendix A: Data Room (`#data`)**: Complete tabular documentation of all 16 underlying datasets, constants, references, and full-package JSON/CSV downloaders.

---

## 💻 Local Development & Quickstart

IGNIS-0G is a zero-dependency, self-contained single-page web application. No package manager or build pipeline is required.

### 1. Run with Python (Standard)
```bash
# From the IGNIS root directory
python -m http.server 8000
```
Open [http://localhost:8000/index.html](http://localhost:8000/index.html) in any modern browser.

### 2. Run with Node.js
```bash
# Using npx serve
npx serve .
```

### 3. Open Directly
Double-click `index.html` to open directly in a web browser via `file://` (audio and web fonts require local server or network connectivity for full asset caching).
