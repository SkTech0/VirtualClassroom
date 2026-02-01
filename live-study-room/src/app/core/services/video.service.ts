// video.service.ts

import { Injectable } from '@angular/core';

import SimplePeer from 'simple-peer';

import { BehaviorSubject } from 'rxjs';

import { SignalRService } from './signalr.service';

import { AuthService } from './auth.service';

 

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

  private screenShareStream: MediaStream | null = null;

  private peers: Map<string, SimplePeer.Instance> = new Map();

  private roomCode: string = '';

  private currentUserId: string = '';

 

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

 

  constructor(private signalR: SignalRService, private auth: AuthService) {

    // Get user ID from token or use a placeholder for now

    this.currentUserId = this.getUserIdFromToken();

    this.setupSignalRHandlers();

  }

 

  private getUserIdFromToken(): string {

    const token = this.auth.getToken();

    if (token) {

      try {

        const payload = JSON.parse(atob(token.split('.')[1]));

        return payload.sub || payload.nameid || 'unknown';

      } catch (e) {

        return 'unknown';

      }

    }

    return 'unknown';

  }

 

  private setupSignalRHandlers() {

    this.signalR.on('UserJoinedVideo', (data: any) => {

      console.log('User joined video:', data);

      let userId: string;

      let username: string;

     

      if (data && typeof data === 'object' && data.userId && data.username) {

        userId = data.userId;

        username = data.username;

      } else if (Array.isArray(data) && data.length >= 2) {

        userId = data[0];

        username = data[1];

      } else {

        userId = data;

        username = 'Guest';

      }

     

      if (userId !== this.currentUserId) {

        this.handleUserJoined(userId, username, true);

      }

    });

 

    this.signalR.on('ExistingVideoParticipants', (participants: any[]) => {

      participants.forEach(p => {

        if (p.userId !== this.currentUserId) {

          this.handleUserJoined(p.userId, p.username, false);

        }

      });

    });

 

    this.signalR.on('UserLeftVideo', (userId: string) => {

      console.log('User left video:', userId);

      this.handleUserLeft(userId);

    });

 

    this.signalR.on('VideoOffer', (data: any) => {

      console.log('Received video offer from:', data.from);

      this.handleVideoOffer(data.from, data.offer);

    });

 

    this.signalR.on('VideoAnswer', (data: any) => {

      console.log('Received video answer from:', data.from);

      this.handleVideoAnswer(data.from, data.answer);

    });

 

    this.signalR.on('VideoIceCandidate', (data: any) => {

      console.log('Received ICE candidate from:', data.from);

      this.handleIceCandidate(data.from, data.candidate);

    });

 

    this.signalR.on('VideoToggle', (data: any) => {

      this.handleVideoToggle(data.userId, data.isVideoEnabled);

    });

 

    this.signalR.on('AudioToggle', (data: any) => {

      this.handleAudioToggle(data.userId, data.isAudioEnabled);

    });

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

 

  async initializeVideo(roomCode: string): Promise<boolean> {

    try {

      this.roomCode = (roomCode || '').trim().toUpperCase();

      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

     

      // Add local participant

      this.addParticipant({

        id: 'local',

        username: 'Me',

        stream: this.localStream,

        isLocal: true

      });

     

      // Update call state to show we're in a call

      this.callStateSubject.next({

        ...this.callStateSubject.value,

        isInCall: true

      });

 

      // Join video call via SignalR (use normalized room code)

      await this.signalR.invoke('JoinVideoCall', this.roomCode);

     

      return true;

    } catch (error) {

      console.error('Error accessing media devices.', error);

      return false;

    }

  }

 

  private async handleUserJoined(userId: string, username: string, initiator: boolean = true) {

    if (this.peers.has(userId) || !this.localStream) return;

 

    const peer = new SimplePeer({

      initiator,

      trickle: false,

      stream: this.localStream as MediaStream

    });

 

    peer.on('signal', (data: any) => {

      this.signalR.invoke('SendVideoOffer', this.roomCode, userId, data);

    });

 

    peer.on('stream', (stream: MediaStream) => {

      this.addParticipant({

        id: userId,

        username: username,

        stream: stream,

        isLocal: false

      });

    });

 

    peer.on('error', (err: any) => {

      console.error('Peer connection error:', err);

      this.removeParticipant(userId);

    });

 

    this.peers.set(userId, peer);

  }

 

  private handleUserLeft(userId: string) {

    this.removeParticipant(userId);

  }

 

  private async handleVideoOffer(from: string, offer: any) {

    if (!this.localStream) return;

 

    const peer = new SimplePeer({

      initiator: false,

      trickle: false,

      stream: this.localStream as MediaStream

    });

 

    peer.on('signal', (data: any) => {

      this.signalR.invoke('SendVideoAnswer', this.roomCode, from, data);

    });

 

    peer.on('stream', (stream: MediaStream) => {

      this.addParticipant({

        id: from,

        username: 'Guest',

        stream: stream,

        isLocal: false

      });

    });

 

    peer.on('error', (err: any) => {

      console.error('Peer connection error:', err);

      this.removeParticipant(from);

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

    const participant = this.callStateSubject.value.participants.find(p => p.id === userId);

    if (participant && participant.stream) {

      const videoTracks = participant.stream.getVideoTracks();

      videoTracks.forEach(track => {

        track.enabled = isVideoEnabled;

      });

    }

  }

 

  private handleAudioToggle(userId: string, isAudioEnabled: boolean) {

    const participant = this.callStateSubject.value.participants.find(p => p.id === userId);

    if (participant && participant.stream) {

      const audioTracks = participant.stream.getAudioTracks();

      audioTracks.forEach(track => {

        track.enabled = isAudioEnabled;

      });

    }

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

 

  private removeParticipant(participantId: string) {

    const peer = this.peers.get(participantId);

    if (peer) {

      peer.destroy();

      this.peers.delete(participantId);

    }

 

    const currentState = this.callStateSubject.value;

    const updatedParticipants = currentState.participants.filter(p => p.id !== participantId);

   

    this.callStateSubject.next({

      ...currentState,

      participants: updatedParticipants

    });

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

       

        // Notify other participants

        this.signalR.invoke('ToggleVideo', this.roomCode, videoTrack.enabled);

       

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

       

        // Notify other participants

        this.signalR.invoke('ToggleAudio', this.roomCode, audioTrack.enabled);

       

        return audioTrack.enabled;

      }

    }

    return false;

  }

 

  async toggleScreenShare(): Promise<boolean> {

    try {

      const currentState = this.callStateSubject.value;

      const isScreenSharing = !currentState.isScreenSharing;

 

      if (isScreenSharing) {

        // Start screen sharing

        this.screenShareStream = await navigator.mediaDevices.getDisplayMedia({

          video: true,

          audio: true

        });

       

        // Replace video track in local stream

        const videoTrack = this.screenShareStream.getVideoTracks()[0];

        if (this.localStream) {

          const oldVideoTrack = this.localStream.getVideoTracks()[0];

          if (oldVideoTrack) {

            this.localStream.removeTrack(oldVideoTrack);

          }

          this.localStream.addTrack(videoTrack);

        }

      } else {

        // Stop screen sharing

        if (this.screenShareStream) {

          this.screenShareStream.getTracks().forEach(track => track.stop());

          this.screenShareStream = null;

         

          // Restore camera video track

          if (this.localStream) {

            const oldVideoTrack = this.localStream.getVideoTracks()[0];

            if (oldVideoTrack) {

              this.localStream.removeTrack(oldVideoTrack);

            }

            // Re-add camera track if available

            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });

            const cameraTrack = cameraStream.getVideoTracks()[0];

            if (cameraTrack) {

              this.localStream.addTrack(cameraTrack);

            }

          }

        }

      }

 

      this.callStateSubject.next({

        ...currentState,

        isScreenSharing

      });

 

      return isScreenSharing;

    } catch (error) {

      console.error('Error toggling screen share:', error);

      return false;

    }

  }

 

  async leaveCall(): Promise<void> {

    // Notify backend

    if (this.roomCode) {

      try {

        await this.signalR.invoke('LeaveVideoCall', this.roomCode);

      } catch (error) {

        console.error('Error leaving video call:', error);

      }

    }

 

    // Clean up peers

    this.peers.forEach(peer => {

      peer.destroy();

    });

    this.peers.clear();

 

    // Stop all streams

    if (this.localStream) {

      this.localStream.getTracks().forEach(track => track.stop());

    }

    if (this.screenShareStream) {

      this.screenShareStream.getTracks().forEach(track => track.stop());

    }

 

    this.callStateSubject.value.participants.forEach(p => {

      p.stream.getTracks().forEach(track => track.stop());

    });

 

    // Reset state

    this.callStateSubject.next({

      isAudioEnabled: false,

      isVideoEnabled: false,

      isInCall: false,

      isScreenSharing: false,

      participants: []

    });

 

    this.localStream = null;

    this.screenShareStream = null;

    this.roomCode = '';

  }

}

 

