# HuMIDI

TypeScript MIDI library for humans. HuMIDIightweight and simple and lightwegith abstraction of the [Web MIDI API](https://www.w3.org/TR/webmidi/).

Currently handles simple use cases for note and connection events.

```javascript
// request midi access
const humidi = new HuMIDI();

// listen to note presses
humidi.onNoteOn((key, velocity) => {
	console.log(`Key ${key} pressed with velocity ${velocity}`);
});

// listen to note releases
humidi.onNoteOff(key => {
    console.log(`Key ${key} released`);
});

// listen to device changes
humidi.onDeviceChange(devices => {
	console.log('Input devices', devices.inputs);
	console.log('Output devices', devices.outputs);
});
```