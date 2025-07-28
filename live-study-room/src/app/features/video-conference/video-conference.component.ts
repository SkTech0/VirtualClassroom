import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoService, VideoPeer, VideoCallState } from '../../core/services/video.service';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-video-conference',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatToolbarModule
  ],
  templateUrl: './video-conference.component.html',
  styleUrls: ['./video-conference.component.css']
})
export class VideoConferenceComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo', { static: false }) localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideosContainer', { static: false }) remoteVideosContainer!: ElementRef<HTMLDivElement>;

  callState$: Observable<VideoCallState>;
  participants: VideoPeer[] = [];
  isVideoEnabled = true;
  isAudioEnabled = true;
  isScreenSharing = false;
  isInCall = false;
  roomCode = '';

  private destroy$ = new Subject<void>();
  private videoElements = new Map<string, HTMLVideoElement>();

  constructor(
    private route: ActivatedRoute,
    private videoService: VideoService,
    private snackBar: MatSnackBar
  ) {
    this.callState$ = this.videoService.callState$;
  }

  async ngOnInit() {
    this.roomCode = this.route.snapshot.paramMap.get('code') || '';
    this.callState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.participants = state.participants;
      this.isVideoEnabled = state.isVideoEnabled;
      this.isAudioEnabled = state.isAudioEnabled;
      this.isScreenSharing = state.isScreenSharing;
      this.isInCall = state.isInCall;
      this.updateVideoElements();
    });
    await this.initializeVideo();
  }

  ngAfterViewInit() {
    this.updateVideoElements();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.videoService.leaveCall(this.roomCode);
  }

  private async initializeVideo() {
    try {
      const success = await this.videoService.initializeVideo(this.roomCode);
      if (!success) {
        this.snackBar.open('Failed to access camera/microphone. Please check permissions and reload.', 'Close', { duration: 7000 });
        console.error('getUserMedia failed for this participant.');
      } else {
        console.log('getUserMedia succeeded for this participant.');
      }
    } catch (err) {
      this.snackBar.open('Unexpected error initializing video: ' + String(err), 'Close', { duration: 7000 });
      console.error('Unexpected error in initializeVideo:', err);
    }
  }

  private updateVideoElements() {
    setTimeout(() => {
      this.participants.forEach(participant => {
        if (participant.isLocal) {
          this.updateLocalVideo(participant);
        } else {
          this.updateRemoteVideo(participant);
        }
      });
    }, 100);
  }

  private updateLocalVideo(participant: VideoPeer) {
    if (this.localVideoRef && this.localVideoRef.nativeElement) {
      const videoElement = this.localVideoRef.nativeElement;
      videoElement.srcObject = participant.stream;
      videoElement.muted = true; // Always mute local video
      videoElement.play().catch(err => console.error('Failed to play local video:', err));
    }
  }

  private updateRemoteVideo(participant: VideoPeer) {
    let videoElement = this.videoElements.get(participant.id);
    
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.className = 'remote-video';
      
      if (this.remoteVideosContainer) {
        this.remoteVideosContainer.nativeElement.appendChild(videoElement);
      }
      
      this.videoElements.set(participant.id, videoElement);
    }
    
    videoElement.srcObject = participant.stream;
    videoElement.play().catch(err => {
      console.error('Failed to play remote video for participant', participant.id, err);
    });
  }

  toggleVideo() {
    try {
      const newState = this.videoService.toggleVideo();
      const message = newState ? 'Video enabled' : 'Video disabled';
      this.snackBar.open(message, 'Close', { duration: 2000 });
    } catch (err) {
      this.snackBar.open('Error toggling video: ' + String(err), 'Close', { duration: 4000 });
      console.error('Error toggling video:', err);
    }
  }

  toggleAudio() {
    try {
      const newState = this.videoService.toggleAudio();
      const message = newState ? 'Audio enabled' : 'Audio disabled';
      this.snackBar.open(message, 'Close', { duration: 2000 });
    } catch (err) {
      this.snackBar.open('Error toggling audio: ' + String(err), 'Close', { duration: 4000 });
      console.error('Error toggling audio:', err);
    }
  }

  async toggleScreenShare() {
    try {
      const newState = await this.videoService.toggleScreenShare();
      const message = newState ? 'Screen sharing started' : 'Screen sharing stopped';
      this.snackBar.open(message, 'Close', { duration: 2000 });
    } catch (err) {
      this.snackBar.open('Error toggling screen share: ' + String(err), 'Close', { duration: 4000 });
      console.error('Error toggling screen share:', err);
    }
  }

  leaveCall() {
    this.videoService.leaveCall(this.roomCode);
    this.snackBar.open('Left video call', 'Close', { duration: 2000 });
  }

  getParticipantCount(): number {
    return this.participants.length;
  }

  getLocalParticipant(): VideoPeer | undefined {
    return this.participants.find(p => p.isLocal);
  }

  getRemoteParticipants(): VideoPeer[] {
    return this.participants.filter(p => !p.isLocal);
  }

  copyRoomCode() {
    navigator.clipboard.writeText(this.roomCode);
    this.snackBar.open('Room code copied to clipboard!', 'Close', { duration: 2000 });
  }
} 