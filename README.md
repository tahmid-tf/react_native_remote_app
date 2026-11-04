# Super Car — React Native Controller App 🏎️💨

Faithful, high-performance React Native & Expo port of the **Super Car Remote Control System** (ported from `ESP32CAR/ESP32CAR/demo`).

## Features

- **Vertical & Horizontal Screen Layouts**:
  - Automatically adapts when device is physically rotated.
  - In-app **Portrait ⇄ Landscape** orientation toggle button in the top bar.
  - **Horizontal mode (Landscape)**: Handheld console / transmitter layout with left thumb for Steering/Rotation + Actions, center for live Car visualization & Quick Moves presets, and right thumb for Movement/Throttle.
  - **Vertical mode (Portrait)**: Full vertical dashboard with car visualizer, side-by-side joysticks, actions, and presets.
- **Dual Gesture Joysticks with Multi-Touch**:
  - **Left Stick (Rotation / Steering)**: Horizontal 1D slider (Left CCW / Right CW).
  - **Right Stick (Movement / Throttle)**: 2D Planar joystick in Mecanum mode (Up Forward, Down Reverse, Left/Right Crab, smooth circular radial clamp); 1D in Classic mode.
  - Supports multi-touch: steer, throttle, and trigger actions simultaneously.
  - Auto-centers and releases to neutral on finger lift.
- **Top-Down Animated Car Stage**:
  - Vector SVG top view of the Super Car with aerodynamic body lines, windshield, cyan LED headlights, and red taillights.
  - Real-time 4-wheel telemetry (M1 Left-Front, M2 Right-Front, M3 Left-Rear, M4 Right-Rear) showing active PWM values.
  - Dynamic chassis tilt (`turn * 22deg`), lateral shift (`strafe`), and forward/reverse surge.
  - Dual exhaust flame animations during Nitro boost and Burnout.
- **Action Buttons**:
  - **BURNOUT**: 100% PWM forward across all motors for 0.1s (100ms) with animated depleting progress bar.
  - **NITRO**: 100% PWM boost across all motors for 1.0s (1000ms) with animated depleting progress bar.
- **Quick Moves Presets (Hold-to-Move, 80% PWM)**:
  - **Orbit**: Side + Rotation
  - **Diagonal dash**: Forward + Right
  - **Side shuffle**: Oscillating Left ⇄ Right
  - **Figure eight**: Flowing turns
  - **Corner pivot**: Rear-right pivot
  - **Dance**: Sway + Rotate
- **Mecanum ⇄ Classic Driving Modes**:
  - Instant toggle between omnidirectional mecanum drive and classic differential drive.
- **OTA Firmware Update**:
  - Full modal with binary file validation (checks ESP32 application magic `0xabcd5432`, size > 288 bytes).
  - Uploads to ESP32 `/api/firmware` with `X-Firmware-Token` and `X-Firmware-Size`.
  - Realistic simulated upload in Interactive Demo mode.
  - Pauses driving controls during update and polls for restart confirmation.
- **ESP32 Telemetry & Settings**:
  - Switch between Interactive Demo mode and Live ESP32 Wi-Fi mode.
  - Configurable ESP32 IP/host (default `http://192.168.4.1`).
  - ESP32 diagnostics viewer (poll reset reason, uptime, free heap, boot count, motor heartbeat).

## Running the App

```bash
# Start the development server
npx expo start

# Open on web
npm run web

# Open on Android
npm run android

# Open on iOS
npm run ios

# Run the test suite
npm test
```

## Testing

Run the automated test suite to verify motor mixing, action timers, presets, firmware validation, transport serialization, and orientation logic:

```bash
npm test
```
# react_native_remote_app
