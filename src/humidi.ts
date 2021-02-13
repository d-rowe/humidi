import bindAll from 'lodash.bindall';
import navigator from 'jzz';

interface MIDIDevice {
    id: string;
    name?: string;
    manufacturer?: string;
    open: () => void;
    close: () => void;
}

interface MIDIDeviceRegistry {
    inputs: MIDIDevice[];
    outputs: MIDIDevice[];
}

type NoteOnHandler = (key: number, velocity: number) => void;
type NoteOffHandler = (key: number) => void;
type DeviceChangeHandler = (devices: MIDIDeviceRegistry) => void;

export const EMPTY_DEVICE_REGISTRY = {
    inputs: [],
    outputs: [],
};

export default class HuMIDI {
    private access?: WebMidi.MIDIAccess;
    private onNoteOnCallbacks: NoteOnHandler[] = [];
    private onNoteOffCallbacks: NoteOffHandler[] = [];
    private onDeviceRegistryChangeCallbacks: DeviceChangeHandler[] = [];

    deviceRegistry: MIDIDeviceRegistry = EMPTY_DEVICE_REGISTRY;

    constructor() {
        bindAll(this, [
            'onAccess',
            'onInternalMessage',
            'onInternalStateChange',
            'initializeInput',
            'initializeOutput',
        ]);

        navigator.requestMIDIAccess().then(
            this.onAccess,
            err => {throw new Error(`Error getting MIDI access: ${err}`);},
        );
    }

    private initializeInput(input: WebMidi.MIDIInput) {
        this.deviceRegistry.inputs.push(this.getDeviceFromIO(input));
        input.onmidimessage = this.onInternalMessage;
        input.onstatechange = this.onInternalStateChange;
    }

    private initializeOutput(output: WebMidi.MIDIOutput) {
        this.deviceRegistry.outputs.push(this.getDeviceFromIO(output));
        output.onstatechange = this.onInternalStateChange;
    }

    private onAccess(access: WebMidi.MIDIAccess) {
        this.access = access;

        access.inputs.forEach(this.initializeInput);
        access.outputs.forEach(this.initializeOutput);
    }

    private syncIO() {
        if (!this.access) {
            throw new Error('Cannot reset input/output without MIDI access');
        }

        this.deviceRegistry.inputs = [];
        this.deviceRegistry.outputs = [];

        // these inputs/outputs are map-like, we can't use native .map
        this.access.inputs.forEach((input: WebMidi.MIDIInput) => {
            this.deviceRegistry.inputs.push(this.getDeviceFromIO(input));     
        });

        this.access.outputs.forEach((output: WebMidi.MIDIOutput) => {
            this.deviceRegistry.outputs.push(this.getDeviceFromIO(output));     
        });
    }

    private getDeviceFromIO(io: WebMidi.MIDIInput | WebMidi.MIDIOutput): MIDIDevice {
        const {id, name, manufacturer, open, close} = io;
        return {id, name, manufacturer, open, close};
    }

    private onInternalStateChange() {
        this.syncIO();

        this.onDeviceRegistryChangeCallbacks.forEach(onDeviceChange => {
            onDeviceChange({...this.deviceRegistry});
        });
    }

    private onInternalMessage({data}: WebMidi.MIDIMessageEvent) {
        const command = data[0];
        const midi = data[1];
        const velocity = data[2];
        
        if (command !== 144) {
            // Ignore messages not related to note changes
            return;
        }

        const key = midi - 12;

        if (velocity) {
            this.onNoteOnCallbacks.forEach(onNoteOn => {
                onNoteOn(key, velocity);
            });

            return;
        }

        this.onNoteOffCallbacks.forEach(onNoteOff => {
            onNoteOff(key);
        })
    }

    onNoteOn(callback: NoteOnHandler): void {
        this.onNoteOnCallbacks.push(callback);
    }

    onNoteOff(callback: NoteOffHandler): void {
        this.onNoteOffCallbacks.push(callback);
    }

    onDeviceChange(callback: DeviceChangeHandler): void {
        this.onDeviceRegistryChangeCallbacks.push(callback);
    }
}
