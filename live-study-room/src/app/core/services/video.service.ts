import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { SignalRService } from './signalr.service';

export interface VideoPeer {
  id: string;
  stream: MediaStream;
  isLocal: boolean;
  username: string;
}

export interface VideoCallState {
  isInCall: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  participants: VideoPeer[];
}

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private localStream: MediaStream | null = null;
  private peers: Map<string, any> = new Map(); // simple-peer instances
  private videoPeers: Map<string, VideoPeer> = new Map();
  
  private callStateSubject = new BehaviorSubject<VideoCallState>({
    isInCall: false,
    isVideoEnabled: true,
    isAudioEnabled: true,
    isScreenSharing: false,
    participants: []
  });

  public callState$ = this.callStateSubject.asObservable();

  constructor(private signalR: SignalRService) {
    this.setupSignalRHandlers();
  }

  private setupSignalRHandlers() {
    this.signalR.on('VideoOffer', (data: any) => {
      this.handleVideoOffer(data.from, data.offer);
    });

    this.signalR.on('VideoAnswer', (data: any) => {
      this.handleVideoAnswer(data.from, data.answer);
    });

    this.signalR.on('VideoIceCandidate', (data: any) => {
      this.handleIceCandidate(data.from, data.candidate);
    });

    this.signalR.on('UserJoinedVideo', (...args: any[]) => {
      const [userId, username] = args;
      this.addPeer(userId, username);
    });

    this.signalR.on('UserLeftVideo', (userId: string) => {
      this.removePeer(userId);
    });

    this.signalR.on('VideoToggle', (data: any) => {
      this.handleVideoToggle(data.userId, data.isVideoEnabled);
    });

    this.signalR.on('AudioToggle', (data: any) => {
      this.handleAudioToggle(data.userId, data.isAudioEnabled);
    });
  }

  async initializeVideo(roomCode: string): Promise<boolean> {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Add local stream to participants
      const localPeer: VideoPeer = {
        id: 'local',
        stream: this.localStream,
        isLocal: true,
        username: 'You'
      };

      this.videoPeers.set('local', localPeer);
      this.updateCallState();

      // Join video call in SignalR
      await this.signalR.invoke('JoinVideoCall', roomCode);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize video:', error);
      return false;
    }
  }

  private async addPeer(userId: string, username: string) {
    if (this.peers.has(userId)) return;

    const Peer = (await import('simple-peer')).default;
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: this.localStream ?? undefined
    });

    peer.on('signal', (data: any) => {
      this.signalR.invoke('SendVideoAnswer', userId, data);
    });

    peer.on('stream', (stream: MediaStream) => {
      const videoPeer: VideoPeer = {
        id: userId,
        stream: stream,
        isLocal: false,
        username: username
      };
      this.videoPeers.set(userId, videoPeer);
      this.updateCallState();
    });

    peer.on('icecandidate', (candidate: any) => {
      this.signalR.invoke('SendVideoIceCandidate', userId, candidate);
    });

    this.peers.set(userId, peer);
  }

  private removePeer(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.destroy();
      this.peers.delete(userId);
    }

    this.videoPeers.delete(userId);
    this.updateCallState();
  }

  private async handleVideoOffer(from: string, offer: any) {
    const Peer = (await import('simple-peer')).default;
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: this.localStream ?? undefined
    });

    peer.on('signal', (data: any) => {
      this.signalR.invoke('SendVideoAnswer', from, data);
    });

    peer.on('stream', (stream: MediaStream) => {
      const videoPeer: VideoPeer = {
        id: from,
        stream: stream,
        isLocal: false,
        username: 'Participant'
      };
      this.videoPeers.set(from, videoPeer);
      this.updateCallState();
    });

    peer.on('icecandidate', (candidate: any) => {
      this.signalR.invoke('SendVideoIceCandidate', from, candidate);
    });

    peer.signal(offer);
    this.peers.set(from, peer);
  }

  private handleVideoAnswer(from: string, answer: any) {
    const peer = this.peers.get(from);
    if (peer) {
      peer.signal(answer);
    }
  }

  private handleIceCandidate(from: string, candidate: any) {
    const peer = this.peers.get(from);
    if (peer) {
      peer.signal(candidate);
    }
  }

  private handleVideoToggle(userId: string, isVideoEnabled: boolean) {
    const peer = this.videoPeers.get(userId);
    if (peer) {
      peer.stream.getVideoTracks().forEach(track => {
        track.enabled = isVideoEnabled;
      });
    }
  }

  private handleAudioToggle(userId: string, isAudioEnabled: boolean) {
    const peer = this.videoPeers.get(userId);
    if (peer) {
      peer.stream.getAudioTracks().forEach(track => {
        track.enabled = isAudioEnabled;
      });
    }
  }

  private updateCallState() {
    const currentState = this.callStateSubject.value;
    const newState: VideoCallState = {
      ...currentState,
      participants: Array.from(this.videoPeers.values())
    };
    this.callStateSubject.next(newState);
  }

  toggleVideo(): boolean {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    const isVideoEnabled = !videoTracks[0].enabled;
    
    videoTracks.forEach(track => {
      track.enabled = isVideoEnabled;
    });

    const currentState = this.callStateSubject.value;
    this.callStateSubject.next({
      ...currentState,
      isVideoEnabled: isVideoEnabled
    });

    // Notify other participants
    this.signalR.invoke('ToggleVideo', isVideoEnabled);
    
    return isVideoEnabled;
  }

  toggleAudio(): boolean {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    const isAudioEnabled = !audioTracks[0].enabled;
    
    audioTracks.forEach(track => {
      track.enabled = isAudioEnabled;
    });

    const currentState = this.callStateSubject.value;
    this.callStateSubject.next({
      ...currentState,
      isAudioEnabled: isAudioEnabled
    });

    // Notify other participants
    this.signalR.invoke('ToggleAudio', isAudioEnabled);
    
    return isAudioEnabled;
  }

  async toggleScreenShare(): Promise<boolean> {
    try {
      const currentState = this.callStateSubject.value;
      
      if (currentState.isScreenSharing) {
        // Stop screen sharing
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
        }
        
        // Reinitialize camera/microphone
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        this.callStateSubject.next({
          ...currentState,
          isScreenSharing: false
        });
        
        return false;
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
        }
        
        this.localStream = screenStream;
        
        this.callStateSubject.next({
          ...currentState,
          isScreenSharing: true
        });
        
        return true;
      }
    } catch (error) {
      console.error('Screen sharing failed:', error);
      return false;
    }
  }

  leaveCall(roomCode: string) {
    // Stop all local streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Destroy all peer connections
    this.peers.forEach(peer => peer.destroy());
    this.peers.clear();
    this.videoPeers.clear();

    // Update call state
    this.callStateSubject.next({
      isInCall: false,
      isVideoEnabled: true,
      isAudioEnabled: true,
      isScreenSharing: false,
      participants: []
    });

    // Notify SignalR
    this.signalR.invoke('LeaveVideoCall', roomCode);
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getParticipants(): VideoPeer[] {
    return Array.from(this.videoPeers.values());
  }
} 