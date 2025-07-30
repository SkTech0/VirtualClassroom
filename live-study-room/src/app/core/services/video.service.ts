// video.service.ts
import { Injectable } from '@angular/core';
import Peer, { MediaConnection } from 'peerjs';
import { BehaviorSubject } from 'rxjs';

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
  private localStream: MediaStream | null = null;
  private currentCall: MediaConnection | null = null;
  private peer!: Peer;

  private callStateSubject = new BehaviorSubject<VideoCallState>({
    isVideoEnabled: true,
    isAudioEnabled: true,
    isInCall: false,
    isScreenSharing: false,
    participants: []
  });

  public callState$ = this.callStateSubject.asObservable();
  
  get callStateSnapshot(): VideoCallState {
    return this.callStateSubject.getValue();
  }
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getCallState(): VideoCallState {
    return this.callStateSubject.value;
  }

  getPeers(): VideoPeer[] {
    return this.callStateSubject.value.participants;
  }

  async initializeVideo(): Promise<boolean> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.peer = new Peer();

      this.peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        this.addParticipant({
          id,
          username: 'Me',
          stream: this.localStream!,
          isLocal: true
        });
      });

      this.peer.on('call', (call: MediaConnection) => {
        call.answer(this.localStream!);
        call.on('stream', (remoteStream) => {
          this.addParticipant({
            id: call.peer,
            username: 'Guest',
            stream: remoteStream,
            isLocal: false
          });
        });
        this.currentCall = call;
      });

      return true;
    } catch (error) {
      console.error('Error accessing media devices.', error);
      return false;
    }
  }

  connectToPeer(peerId: string) {
    if (!this.peer || !this.localStream) return;

    const call = this.peer.call(peerId, this.localStream);
    call.on('stream', (remoteStream) => {
      this.addParticipant({
        id: peerId,
        username: 'Guest',
        stream: remoteStream,
        isLocal: false
      });
    });
    this.currentCall = call;
  }

  private addParticipant(participant: VideoPeer) {
    const currentState = this.callStateSubject.value;
    const exists = currentState.participants.some(p => p.id === participant.id);

    if (!exists) {
      this.callStateSubject.next({
        ...currentState,
        isInCall: true,
        participants: [...currentState.participants, participant]
      });
    }
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newState = {
          ...this.callStateSubject.value,
          isVideoEnabled: videoTrack.enabled
        };
        this.callStateSubject.next(newState);
        return videoTrack.enabled;
      }
    }
    return false;
  }

  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newState = {
          ...this.callStateSubject.value,
          isAudioEnabled: audioTrack.enabled
        };
        this.callStateSubject.next(newState);
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleScreenShare(): boolean {
    const newState = !this.callStateSubject.value.isScreenSharing;
    this.callStateSubject.next({
      ...this.callStateSubject.value,
      isScreenSharing: newState
    });
    return newState;
  }

  leaveCall(): void {
    if (this.currentCall) {
      this.currentCall.close();
      this.currentCall = null;
    }

    this.callStateSubject.value.participants.forEach(p => {
      p.stream.getTracks().forEach(track => track.stop());
    });

    this.callStateSubject.next({
      isAudioEnabled: false,
      isVideoEnabled: false,
      isInCall: false,
      isScreenSharing: false,
      participants: []
    });

    this.localStream = null;

    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
    }
  }
}
