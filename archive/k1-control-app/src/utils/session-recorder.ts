import { K1AudioData, K1PerformanceData, K1RealtimeData, K1DeviceInfo, K1Parameters } from '../types/k1-types';

interface SessionSample<T> {
  t: number; // ms timestamp
  data: T;
}

interface SessionRecording {
  startedAt: number;
  stoppedAt?: number;
  deviceInfo?: K1DeviceInfo | null;
  endpoint?: string;
  meta?: Record<string, any>;
  performance: SessionSample<K1PerformanceData>[];
  audio: SessionSample<K1AudioData>[];
  parameters: SessionSample<Partial<K1Parameters>>[];
}

class SessionRecorder {
  private recording: boolean = false;
  private session: SessionRecording | null = null;

  start(deviceInfo?: K1DeviceInfo | null, endpoint?: string, meta?: Record<string, any>) {
    if (this.recording) return;
    this.recording = true;
    this.session = {
      startedAt: Date.now(),
      deviceInfo,
      endpoint,
      meta,
      performance: [],
      audio: [],
      parameters: [],
    };
  }

  stop() {
    if (!this.recording || !this.session) return;
    this.recording = false;
    this.session.stoppedAt = Date.now();
  }

  isRecording(): boolean {
    return this.recording;
  }

  recordRealtime(data: K1RealtimeData) {
    if (!this.recording || !this.session) return;
    const now = Date.now();
    if (data.performance) {
      this.session.performance.push({ t: now, data: data.performance });
    }
    if (data.audio) {
      this.session.audio.push({ t: now, data: data.audio });
    }
    if (data.parameters) {
      this.session.parameters.push({ t: now, data: data.parameters });
    }
  }

  recordPerformance(perf: K1PerformanceData) {
    if (!this.recording || !this.session) return;
    this.session.performance.push({ t: Date.now(), data: perf });
  }

  recordAudio(audio: K1AudioData) {
    if (!this.recording || !this.session) return;
    this.session.audio.push({ t: Date.now(), data: audio });
  }

  recordParameters(params: Partial<K1Parameters>) {
    if (!this.recording || !this.session) return;
    this.session.parameters.push({ t: Date.now(), data: params });
  }

  export(): { success: boolean; data?: SessionRecording; error?: string } {
    if (!this.session) {
      return { success: false, error: 'No session' };
    }
    const data: SessionRecording = {
      ...this.session,
      // Optionally clamp to reasonable sizes
      performance: this.session.performance.slice(-60000),
      audio: this.session.audio.slice(-60000),
      parameters: this.session.parameters.slice(-60000),
    };
    return { success: true, data };
  }

  reset() {
    this.recording = false;
    this.session = null;
  }
}

export const sessionRecorder = new SessionRecorder();