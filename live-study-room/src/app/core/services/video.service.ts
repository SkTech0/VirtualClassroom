import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteParticipant,
  TrackPublication,
  LocalTrack,
  createLocalTracks,
} from 'livekit-client';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { environment } from '../../../environments/environment';

export interface VideoPeer {
  id: string;
  username: string;
  stream: MediaStream;
  isLocal: boolean;
}

export interface VideoCallState {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isInCall: boolean;
  isScreenSharing: boolean;
  participants: VideoPeer[];
}

@Injectable({ providedIn: 'root' })
export class VideoService {
  private room: Room | null = null;
  private roomCode = '';
  private localStream: MediaStream | null = null;
  private screenShareStream: MediaStream | null = null;
  private remoteStreams = new Map<string, MediaStream>();

  private callStateSubject = new BehaviorSubject<VideoCallState>({
    isVideoEnabled: true,
    isAudioEnabled: true,
    isInCall: false,
    isScreenSharing: false,
    participants: [],
  });

  public callState$ = this.callStateSubject.asObservable();

  get callStateSnapshot(): VideoCallState {
    return this.callStateSubject.getValue();
  }

  constructor(private auth: AuthService, private api: ApiService) {}

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getCallState(): VideoCallState {
    return this.callStateSubject.value;
  }

  getPeers(): VideoPeer[] {
    return this.callStateSubject.value.participants;
  }

  private getUserId(): string {
    const token = this.auth.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, string>;
        return payload['sub'] ?? payload['nameid'] ?? 'unknown';
      } catch {
        // ignore
      }
    }
    return 'unknown';
  }

  private getUsername(): string {
    const user = this.auth.getUserFromStorage();
    return user?.username ?? 'Guest';
  }

  private updateParticipantsFromState(): void {
    const participants: VideoPeer[] = [];
    if (this.localStream) {
      participants.push({
        id: 'local',
        username: 'Me',
        stream: this.localStream,
        isLocal: true,
      });
    }
    this.remoteStreams.forEach((stream, id) => {
      const pub = this.room?.remoteParticipants.get(id);
      participants.push({
        id,
        username: pub?.name ?? id,
        stream,
        isLocal: false,
      });
    });
    this.callStateSubject.next({
      ...this.callStateSubject.value,
      participants,
    });
  }

  async initializeVideo(roomCode: string): Promise<boolean> {
    const serverUrl = (environment as { livekitServerUrl?: string }).livekitServerUrl;
    if (!serverUrl?.trim()) {
      console.error('LiveKit server URL is not configured. Set livekitServerUrl in environment.');
      return false;
    }

    const code = (roomCode || '').trim().toUpperCase();
    this.roomCode = code;

    try {
      const body = { roomCode: code, canPublish: true, canSubscribe: true };
      const res = await firstValueFrom(
        this.api.post<{ token: string; roomName: string }>(API_ENDPOINTS.video.livekitToken, body)
      );
      const token = res?.token;
      if (!token) {
        console.error('No LiveKit token received');
        return false;
      }

      const tracks = await createLocalTracks({ video: true, audio: true });
      this.localStream = new MediaStream();
      tracks.forEach((t: LocalTrack) => {
        if (t.mediaStreamTrack) this.localStream!.addTrack(t.mediaStreamTrack);
      });

      this.callStateSubject.next({
        ...this.callStateSubject.value,
        isInCall: true,
        isVideoEnabled: true,
        isAudioEnabled: true,
        participants: [
          { id: 'local', username: 'Me', stream: this.localStream, isLocal: true },
        ],
      });

      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this.room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
          this.handleRemoteTrackSubscribed(participant.identity, participant.name ?? participant.identity, track);
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
          this.handleRemoteTrackUnsubscribed(participant.identity, track);
        })
        .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          this.removeRemoteParticipant(participant.identity);
        });

      await this.room.connect(serverUrl, token, {
        autoSubscribe: true,
      });

      const localParticipant = this.room.localParticipant;
      for (const track of tracks) {
        await localParticipant.publishTrack(track, { name: this.getUsername() });
      }

      return true;
    } catch (error) {
      console.error('Error initializing LiveKit video:', error);
      this.cleanup();
      return false;
    }
  }

  private handleRemoteTrackSubscribed(participantId: string, name: string, track: RemoteTrack): void {
    let stream = this.remoteStreams.get(participantId);
    if (!stream) {
      stream = new MediaStream();
      this.remoteStreams.set(participantId, stream);
    }
    if (track.mediaStreamTrack) stream.addTrack(track.mediaStreamTrack);
    this.callStateSubject.next({
      ...this.callStateSubject.value,
      participants: this.buildParticipantsList(),
    });
  }

  private handleRemoteTrackUnsubscribed(participantId: string, track: RemoteTrack): void {
    const stream = this.remoteStreams.get(participantId);
    if (stream && track.mediaStreamTrack) {
      stream.removeTrack(track.mediaStreamTrack);
      if (stream.getTracks().length === 0) this.remoteStreams.delete(participantId);
    }
    this.callStateSubject.next({
      ...this.callStateSubject.value,
      participants: this.buildParticipantsList(),
    });
  }

  private removeRemoteParticipant(participantId: string): void {
    const stream = this.remoteStreams.get(participantId);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    this.remoteStreams.delete(participantId);
    this.callStateSubject.next({
      ...this.callStateSubject.value,
      participants: this.buildParticipantsList(),
    });
  }

  private buildParticipantsList(): VideoPeer[] {
    const list: VideoPeer[] = [];
    if (this.localStream) {
      list.push({ id: 'local', username: 'Me', stream: this.localStream, isLocal: true });
    }
    this.remoteStreams.forEach((stream, id) => {
      const pub = this.room?.remoteParticipants.get(id);
      list.push({ id, username: pub?.name ?? id, stream, isLocal: false });
    });
    return list;
  }

  toggleVideo(): boolean {
    if (!this.room?.localParticipant) return false;
    const enabled = !this.callStateSnapshot.isVideoEnabled;
    this.room.localParticipant.setCameraEnabled(enabled);
    this.callStateSubject.next({ ...this.callStateSubject.value, isVideoEnabled: enabled });
    return enabled;
  }

  toggleAudio(): boolean {
    if (!this.room?.localParticipant) return false;
    const enabled = !this.callStateSnapshot.isAudioEnabled;
    this.room.localParticipant.setMicrophoneEnabled(enabled);
    this.callStateSubject.next({ ...this.callStateSubject.value, isAudioEnabled: enabled });
    return enabled;
  }

  async toggleScreenShare(): Promise<boolean> {
    const current = this.callStateSnapshot.isScreenSharing;
    try {
      if (current) {
        await this.room?.localParticipant.setScreenShareEnabled(false);
        if (this.screenShareStream) {
          this.screenShareStream.getTracks().forEach((t) => t.stop());
          this.screenShareStream = null;
        }
        this.callStateSubject.next({ ...this.callStateSubject.value, isScreenSharing: false });
        return false;
      } else {
        await this.room?.localParticipant.setScreenShareEnabled(true);
        this.callStateSubject.next({ ...this.callStateSubject.value, isScreenSharing: true });
        return true;
      }
    } catch (e) {
      const err = e as DOMException & { name?: string };
      if (err?.name === 'NotAllowedError') throw new Error('Screen share was cancelled or permission was denied.');
      if (err?.name === 'NotFoundError') throw new Error('No screen or window was selected.');
      throw e;
    }
  }

  async leaveCall(): Promise<void> {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.room) {
      this.room.disconnect(true);
      this.room = null;
    }
    this.remoteStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    this.remoteStreams.clear();
    if (this.localStream) this.localStream.getTracks().forEach((t) => t.stop());
    if (this.screenShareStream) this.screenShareStream.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.screenShareStream = null;
    this.roomCode = '';
    this.callStateSubject.next({
      isVideoEnabled: false,
      isAudioEnabled: false,
      isInCall: false,
      isScreenSharing: false,
      participants: [],
    });
  }
}
